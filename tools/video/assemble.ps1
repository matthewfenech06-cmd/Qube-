param(
  [string]$FramesDir,
  [int]$Count = 196,
  [string]$OutDir,
  [string]$OutName,
  [int]$Width,
  [int]$Height,
  [int]$Bitrate,
  [switch]$Boomerang
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.TranscodeFailureReason, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null

$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asOpProg = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2' })[0]
function Await($op, [Type]$t) { $x = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); $x.Wait(-1) | Out-Null; $x.Result }
function AwaitProg($op, [Type]$t, [Type]$p) { $x = $asOpProg.MakeGenericMethod($t, $p).Invoke($null, @($op)); $x.Wait(-1) | Out-Null; $x.Result }

# forward, then back (skipping both end frames so the turnaround never holds)
$order = @(0..($Count - 1))
if ($Boomerang) { $order += @(($Count - 2)..1) }

$files = @{}
$comp = New-Object Windows.Media.Editing.MediaComposition
$add = [System.Collections.Generic.ICollection[Windows.Media.Editing.MediaClip]].GetMethod('Add')
$oneFrame = [TimeSpan]::FromTicks(400000)   # exactly 1/25 s
$sw = [Diagnostics.Stopwatch]::StartNew()
foreach ($k in $order) {
  if (-not $files.ContainsKey($k)) {
    $files[$k] = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Join-Path $FramesDir ("f{0:D3}.jpg" -f $k)))) ([Windows.Storage.StorageFile])
  }
  $clip = Await ([Windows.Media.Editing.MediaClip]::CreateFromImageFileAsync($files[$k], $oneFrame)) ([Windows.Media.Editing.MediaClip])
  $add.Invoke($comp.Clips, @($clip)) | Out-Null
}
"clips: {0}, timeline: {1:N2}s, built in {2:N1}s, working set {3:N0} MB" -f $order.Count, $comp.Duration.TotalSeconds, $sw.Elapsed.TotalSeconds, ([Diagnostics.Process]::GetCurrentProcess().WorkingSet64 / 1MB)

$enc = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD1080p)
$enc.Video.Width = $Width
$enc.Video.Height = $Height
$enc.Video.Bitrate = $Bitrate
$enc.Video.FrameRate.Numerator = 25
$enc.Video.FrameRate.Denominator = 1
$enc.Audio = $null

$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($OutDir)) ([Windows.Storage.StorageFolder])
$dest = Await ($folder.CreateFileAsync($OutName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
$sw.Restart()
$result = AwaitProg ($comp.RenderToFileAsync($dest, [Windows.Media.Editing.MediaTrimmingPreference]::Precise, $enc)) ([Windows.Media.Transcoding.TranscodeFailureReason]) ([double])
$out = Join-Path $OutDir $OutName
"render: {0} in {1:N1}s -> {2:N2} MB" -f $result, $sw.Elapsed.TotalSeconds, ((Get-Item $out).Length / 1MB)
