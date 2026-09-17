param(
  [string]$InDir,
  [string]$OutLand,
  [string]$OutPort,
  [string]$Frames = "",              # comma list for previews; empty = all 0..Count-1
  [int]$Count = 196,
  [double]$Gain = 1.08,
  [double]$Keep = 0.22,
  [double]$PortCenter = 0.72,
  [long]$Quality = 92,
  # luminance stops and brand colours (r,g,b per stop)
  [string]$Stops = "0,.10,.24,.42,.62,.80,1",
  [string]$Colors = "6,5,22, 18,16,62, 42,44,150, 74,62,205, 128,100,232, 190,170,250, 250,247,255"
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

public static class QubeGrade {
  static byte[] lr = new byte[256], lg = new byte[256], lb = new byte[256];

  // gradient map: luminance -> brand colour, smoothstepped between stops
  public static void SetStops(double[] p, int[] rgb) {
    for (int i = 0; i < 256; i++) {
      double L = i / 255.0;
      int k = 0; while (k < p.Length - 2 && L > p[k + 1]) k++;
      double t = (L - p[k]) / (p[k + 1] - p[k]); if (t < 0) t = 0; if (t > 1) t = 1;
      t = t * t * (3 - 2 * t);
      lr[i] = (byte)Math.Round(rgb[k * 3]     + (rgb[(k + 1) * 3]     - rgb[k * 3])     * t);
      lg[i] = (byte)Math.Round(rgb[k * 3 + 1] + (rgb[(k + 1) * 3 + 1] - rgb[k * 3 + 1]) * t);
      lb[i] = (byte)Math.Round(rgb[k * 3 + 2] + (rgb[(k + 1) * 3 + 2] - rgb[k * 3 + 2]) * t);
    }
  }

  // out = map(L * gain) * (1 - keep) + original * keep
  static void Grade(Bitmap bmp, double gain, double keep) {
    var data = bmp.LockBits(new Rectangle(0, 0, bmp.Width, bmp.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int stride = data.Stride, h = bmp.Height, w = bmp.Width;
    byte[] buf = new byte[stride * h];
    Marshal.Copy(data.Scan0, buf, 0, buf.Length);
    int keepQ = (int)Math.Round(keep * 256), mapQ = 256 - keepQ, gainQ = (int)Math.Round(gain * 256);
    Parallel.For(0, h, y => {
      int row = y * stride;
      for (int x = 0; x < w; x++) {
        int i = row + x * 4;
        int b = buf[i], g = buf[i + 1], r = buf[i + 2];
        int L = ((54 * r + 183 * g + 19 * b) >> 8) * gainQ >> 8; if (L > 255) L = 255;
        buf[i + 2] = (byte)((lr[L] * mapQ + r * keepQ) >> 8);
        buf[i + 1] = (byte)((lg[L] * mapQ + g * keepQ) >> 8);
        buf[i]     = (byte)((lb[L] * mapQ + b * keepQ) >> 8);
      }
    });
    Marshal.Copy(buf, 0, data.Scan0, buf.Length);
    bmp.UnlockBits(data);
  }

  static ImageCodecInfo jpg;
  static void SaveJpeg(Bitmap bmp, string path, long q) {
    if (jpg == null) foreach (var e in ImageCodecInfo.GetImageEncoders()) if (e.MimeType == "image/jpeg") jpg = e;
    var ps = new EncoderParameters(1);
    ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, q);
    bmp.Save(path, jpg, ps);
  }

  static Bitmap Resample(Bitmap src, Rectangle r, int w, int h) {
    var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(dst)) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.CompositingQuality = CompositingQuality.HighQuality;
      using (var ia = new ImageAttributes()) {
        ia.SetWrapMode(WrapMode.TileFlipXY); // stops dark edge bleed when resampling
        g.DrawImage(src, new Rectangle(0, 0, w, h), r.X, r.Y, r.Width, r.Height, GraphicsUnit.Pixel, ia);
      }
    }
    return dst;
  }

  public static void Frame(string inPath, string landPath, string portPath, double gain, double keep, double portCenter, long q) {
    using (var src = new Bitmap(inPath)) {
      using (var land = Resample(src, new Rectangle(0, 0, src.Width, src.Height), 1920, 1080)) {
        Grade(land, gain, keep); SaveJpeg(land, landPath, q);
      }
      int cw = (int)Math.Round(src.Height * 9.0 / 16.0);
      int cx = (int)Math.Round(src.Width * portCenter - cw / 2.0);
      if (cx < 0) cx = 0; if (cx + cw > src.Width) cx = src.Width - cw;
      using (var port = Resample(src, new Rectangle(cx, 0, cw, src.Height), 720, 1280)) {
        Grade(port, gain, keep); SaveJpeg(port, portPath, q);
      }
    }
  }
}
'@
if (-not ("QubeGrade" -as [type])) {
  Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies System.Drawing
}
$p = [double[]]($Stops -split ',' | ForEach-Object { [double]::Parse($_.Trim(), [Globalization.CultureInfo]::InvariantCulture) })
$c = [int[]]($Colors -split ',' | ForEach-Object { [int]$_.Trim() })
[QubeGrade]::SetStops($p, $c)
New-Item -ItemType Directory -Force -Path $OutLand, $OutPort | Out-Null

$list = if ($Frames) { $Frames -split ',' | ForEach-Object { [int]$_ } } else { 0..($Count - 1) }
$sw = [Diagnostics.Stopwatch]::StartNew()
foreach ($k in $list) {
  $n = "f{0:D3}.jpg" -f $k
  [QubeGrade]::Frame((Join-Path $InDir $n), (Join-Path $OutLand $n), (Join-Path $OutPort $n), $Gain, $Keep, $PortCenter, $Quality)
}
"graded {0} frames in {1:N1}s" -f @($list).Count, $sw.Elapsed.TotalSeconds
