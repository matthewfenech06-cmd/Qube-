# Hero-video pipeline with no ffmpeg: Windows' built-in media APIs (WinRT)
# driven from Windows PowerShell 5.1. Recipe used for assets/video/qube-hero*:
#   1. frames:   winrt-media.ps1 -Src clip.mp4 -OutDir raw -Mode allframes -ThumbW 2560 -ThumbH 1440
#                (slow on 4K sources, ~6 s/frame: each frame decodes from its keyframe)
#   2. grade:    grade.ps1 -InDir raw -OutLand land -OutPort port -Count <frames> -Gain 1.14
#                -Colors "6,5,22, 20,16,64, 50,42,152, 90,66,208, 136,104,234, 196,176,252, 250,247,255"
#   3. encode:   assemble.ps1 -FramesDir land -Count <frames> -OutDir out -OutName land.mp4 -Width 1920 -Height 1080 -Bitrate 2000000 -Boomerang
#                assemble.ps1 -FramesDir port -Count <frames> -OutDir out -OutName port.mp4 -Width 720 -Height 1280 -Bitrate 1100000 -Boomerang
#   4. faststart: node faststart.js out/land.mp4 assets/video/qube-hero.mp4   (Media Foundation writes moov last)
# Modes here: frames (a few stills to look at), allframes (every frame), transcode (straight re-encode).
param(
  [string]$Src,
  [string]$OutDir,
  [string]$Mode = "frames",          # frames | transcode
  [string]$Times = "0,1.5,3,4.5,6,6.9",
  [int]$ThumbW = 960,
  [int]$ThumbH = 540,
  [string]$OutName = "out.mp4",
  [int]$Width = 1920,
  [int]$Height = 1080,
  [int]$Bitrate = 3000000,
  [int]$MaxFrames = 0                # allframes: stop after this many (0 = whole clip)
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.ImageStream, Windows.Graphics, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOp = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskActProg = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]

function Await($op, [Type]$type) {
  $t = $asTaskOp.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}
function AwaitProgress($op, [Type]$progressType) {
  $t = $asTaskActProg.MakeGenericMethod($progressType).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Src)) ([Windows.Storage.StorageFile])

if ($Mode -eq "frames") {
  $clip = Await ([Windows.Media.Editing.MediaClip]::CreateFromFileAsync($file)) ([Windows.Media.Editing.MediaClip])
  "DURATION = " + $clip.OriginalDuration.TotalSeconds
  $comp = New-Object Windows.Media.Editing.MediaComposition
  [System.Collections.Generic.ICollection[Windows.Media.Editing.MediaClip]].GetMethod('Add').Invoke($comp.Clips, @($clip)) | Out-Null
  foreach ($s in ($Times -split ',')) {
    $ts = [TimeSpan]::FromSeconds([double]$s)
    $img = Await ($comp.GetThumbnailAsync($ts, $ThumbW, $ThumbH, [Windows.Media.Editing.VideoFramePrecision]::NearestFrame)) ([Windows.Graphics.Imaging.ImageStream])
    $name = "frame_" + ($s -replace '\.', '_') + ".jpg"
    $path = Join-Path $OutDir $name
    $in = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($img)
    $fs = [System.IO.File]::Create($path)
    $in.CopyTo($fs); $fs.Close(); $in.Close()
    "wrote $path ({0:N0} KB)" -f ((Get-Item $path).Length / 1KB)
  }
}
elseif ($Mode -eq "allframes") {
  $clip = Await ([Windows.Media.Editing.MediaClip]::CreateFromFileAsync($file)) ([Windows.Media.Editing.MediaClip])
  $comp = New-Object Windows.Media.Editing.MediaComposition
  [System.Collections.Generic.ICollection[Windows.Media.Editing.MediaClip]].GetMethod('Add').Invoke($comp.Clips, @($clip)) | Out-Null
  $fps = 25
  $n = [int][Math]::Floor($clip.OriginalDuration.TotalSeconds * $fps)
  if ($MaxFrames -gt 0 -and $MaxFrames -lt $n) { $n = $MaxFrames }
  "frames to extract: $n at ${ThumbW}x${ThumbH}"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  for ($k = 0; $k -lt $n; $k++) {
    $ts = [TimeSpan]::FromSeconds(($k + 0.5) / $fps)
    $img = Await ($comp.GetThumbnailAsync($ts, $ThumbW, $ThumbH, [Windows.Media.Editing.VideoFramePrecision]::NearestFrame)) ([Windows.Graphics.Imaging.ImageStream])
    $path = Join-Path $OutDir ("f{0:D3}.jpg" -f $k)
    $in = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($img)
    $fs = [System.IO.File]::Create($path)
    $in.CopyTo($fs); $fs.Close(); $in.Close()
    if ($k % 25 -eq 0) { "  frame $k  ({0:N1}s elapsed)" -f $sw.Elapsed.TotalSeconds }
  }
  "done: $n frames in {0:N1}s" -f $sw.Elapsed.TotalSeconds
}
elseif ($Mode -eq "transcode") {
  $profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD1080p)
  $profile.Video.Width = $Width
  $profile.Video.Height = $Height
  $profile.Video.Bitrate = $Bitrate
  $profile.Video.FrameRate.Numerator = 25
  $profile.Video.FrameRate.Denominator = 1
  $profile.Audio = $null
  $folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($OutDir)) ([Windows.Storage.StorageFolder])
  $dest = Await ($folder.CreateFileAsync($OutName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $tx = New-Object Windows.Media.Transcoding.MediaTranscoder
  $tx.HardwareAccelerationEnabled = $true
  $prep = Await ($tx.PrepareFileTranscodeAsync($file, $dest, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
  if (-not $prep.CanTranscode) { throw "cannot transcode: $($prep.FailureReason)" }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  AwaitProgress ($prep.TranscodeAsync()) ([double])
  $out = Join-Path $OutDir $OutName
  "transcoded $out in {0:N1}s -> {1:N2} MB" -f $sw.Elapsed.TotalSeconds, ((Get-Item $out).Length / 1MB)
}
