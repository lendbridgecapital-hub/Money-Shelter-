Add-Type -AssemblyName System.Drawing
$srcPath = (Resolve-Path 'public/lendbridge-logo.png').Path
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$sizes = @(
    @{ dir = 'mipmap-mdpi'; size = 48 },
    @{ dir = 'mipmap-hdpi'; size = 72 },
    @{ dir = 'mipmap-xhdpi'; size = 96 },
    @{ dir = 'mipmap-xxhdpi'; size = 144 },
    @{ dir = 'mipmap-xxxhdpi'; size = 192 }
)

foreach ($s in $sizes) {
    $destDir = Join-Path 'android/app/src/main/res' $s.dir
    $canvas = New-Object System.Drawing.Bitmap($s.size, $s.size)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    
    # Calculate scaled aspect fit inside the icon with 10% padding
    $innerSize = $s.size * 0.88
    $scale = [Math]::Min($innerSize / $srcImg.Width, $innerSize / $srcImg.Height)
    $drawW = [int]($srcImg.Width * $scale)
    $drawH = [int]($srcImg.Height * $scale)
    $x = [int](($s.size - $drawW) / 2)
    $y = [int](($s.size - $drawH) / 2)
    
    $g.DrawImage($srcImg, $x, $y, $drawW, $drawH)
    $g.Dispose()
    
    $canvas.Save((Join-Path $destDir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Save((Join-Path $destDir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Save((Join-Path $destDir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Output ("Generated Lendbridge icon in $destDir ($($s.size)x$($s.size))")
}
$srcImg.Dispose()
