# Normalises editorial artwork to a 16:9 crop used by every card and hero.
# Portrait sources take their crop from the top so faces and subjects survive.
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot '..\public\images'
$topAnchored = @('running', 'maasai-mara', 'city-night')
$targetW = 1600
$targetH = 900

Get-ChildItem $dir -Filter *.jpg | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $targetRatio = $targetW / $targetH
  $srcRatio = $img.Width / $img.Height

  if ($srcRatio -gt $targetRatio) {
    $cropH = $img.Height
    $cropW = [int]($img.Height * $targetRatio)
    $cropX = [int](($img.Width - $cropW) / 2)
    $cropY = 0
  } else {
    $cropW = $img.Width
    $cropH = [int]($img.Width / $targetRatio)
    $cropX = 0
    if ($topAnchored -contains $_.BaseName) {
      $cropY = [int]($img.Height * 0.06)
    } else {
      $cropY = [int](($img.Height - $cropH) / 2)
    }
  }

  $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)), $cropX, $cropY, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82L)
  $tmp = $_.FullName + '.tmp'
  $bmp.Save($tmp, $codec, $params)

  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  Move-Item -Force $tmp $_.FullName
  Write-Host ("{0}: {1}x{2}" -f $_.BaseName, $targetW, $targetH)
}
