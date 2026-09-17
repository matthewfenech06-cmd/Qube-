# Seamless-loop frame builders for short clips.
#   crossfade: for locked-off (tripod) shots, especially crowds. Output is
#              N-F frames; the last F dissolve into the start, so the wrap is
#              invisible and nobody walks backwards.
#   boomerang: for moving-camera shots. Frames forward then back, resampled to
#              WxH (source can be larger).
# Output frames are f000.jpg.. in OutDir, ready for assemble.ps1 (no -Boomerang).
param(
  [ValidateSet("crossfade", "boomerang")][string]$Mode,
  [string]$InDir,
  [string]$OutDir,
  [int]$Count,             # source frames to use
  [int]$Fade = 25,         # crossfade length in frames
  [int]$Width = 960,
  [int]$Height = 540,
  [long]$Quality = 92
)
$ErrorActionPreference = "Stop"
$code = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

public static class QubeLoop {
  static ImageCodecInfo jpg;
  static EncoderParameters Q(long q) {
    var ps = new EncoderParameters(1);
    ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, q);
    return ps;
  }
  static void Save(Bitmap b, string path, long q) {
    if (jpg == null) foreach (var e in ImageCodecInfo.GetImageEncoders()) if (e.MimeType == "image/jpeg") jpg = e;
    b.Save(path, jpg, Q(q));
  }
  static Bitmap Load(string path, int w, int h) {
    using (var src = new Bitmap(path)) {
      var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
      using (var g = Graphics.FromImage(dst)) {
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        using (var ia = new ImageAttributes()) {
          ia.SetWrapMode(WrapMode.TileFlipXY);
          g.DrawImage(src, new Rectangle(0, 0, w, h), 0, 0, src.Width, src.Height, GraphicsUnit.Pixel, ia);
        }
      }
      return dst;
    }
  }
  static string F(string dir, int k) { return Path.Combine(dir, "f" + k.ToString("D3") + ".jpg"); }

  // a = a*(1-t) + b*t, in place
  static void Blend(Bitmap a, Bitmap b, double t) {
    var r = new Rectangle(0, 0, a.Width, a.Height);
    var da = a.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var db = b.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int len = da.Stride * a.Height;
    byte[] ba = new byte[len], bb = new byte[len];
    Marshal.Copy(da.Scan0, ba, 0, len); Marshal.Copy(db.Scan0, bb, 0, len);
    int tq = (int)Math.Round(t * 256), sq = 256 - tq, stride = da.Stride, h = a.Height;
    Parallel.For(0, h, y => {
      int row = y * stride;
      for (int i = row; i < row + stride; i++) ba[i] = (byte)((ba[i] * sq + bb[i] * tq) >> 8);
    });
    Marshal.Copy(ba, 0, da.Scan0, len);
    a.UnlockBits(da); b.UnlockBits(db);
  }

  public static int Crossfade(string inDir, string outDir, int n, int fade, int w, int h, long q) {
    int len = n - fade;
    for (int j = 0; j < len; j++) {
      using (var cur = Load(F(inDir, fade + j), w, h)) {
        int m = j - (len - fade);               // position inside the closing dissolve
        if (m >= 0) using (var head = Load(F(inDir, m), w, h)) Blend(cur, head, (m + 1) / (double)(fade + 1));
        Save(cur, F(outDir, j), q);
      }
    }
    return len;
  }

  public static int Boomerang(string inDir, string outDir, int n, int w, int h, long q) {
    int o = 0;
    for (int k = 0; k < n; k++) using (var b = Load(F(inDir, k), w, h)) Save(b, F(outDir, o++), q);
    for (int k = n - 2; k >= 1; k--) using (var b = Load(F(inDir, k), w, h)) Save(b, F(outDir, o++), q);
    return o;
  }
}
'@
if (-not ("QubeLoop" -as [type])) { Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies System.Drawing }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$sw = [Diagnostics.Stopwatch]::StartNew()
$made = if ($Mode -eq "crossfade") { [QubeLoop]::Crossfade($InDir, $OutDir, $Count, $Fade, $Width, $Height, $Quality) } else { [QubeLoop]::Boomerang($InDir, $OutDir, $Count, $Width, $Height, $Quality) }
"{0}: {1} loop frames ({2:N2}s) in {3:N1}s -> {4}" -f $Mode, $made, ($made / 25.0), $sw.Elapsed.TotalSeconds, $OutDir
