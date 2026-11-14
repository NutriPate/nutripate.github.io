$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $siteRoot 'index.html'
$target = Join-Path $siteRoot 'index-standalone.html'
$html = [System.IO.File]::ReadAllText($source, [System.Text.Encoding]::UTF8)
$html = [regex]::Replace($html, 'src="(assets/[^"\r\n]+)"', {
  param($match)
  $relative = $match.Groups[1].Value -replace '/', [IO.Path]::DirectorySeparatorChar
  $assetPath = Join-Path $siteRoot $relative
  if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) { return $match.Value }
  $bytes = [IO.File]::ReadAllBytes($assetPath)
  $base64 = [Convert]::ToBase64String($bytes)
  $extension = [IO.Path]::GetExtension($assetPath).ToLowerInvariant()
  $mime = switch ($extension) {
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.webp' { 'image/webp' }
    default { 'application/octet-stream' }
  }
  return ('src="data:{0};base64,{1}"' -f $mime, $base64)
})
$html = [regex]::Replace($html, 'href="privacy-policy\.pdf"', {
  $pdfPath = Join-Path $siteRoot 'privacy-policy.pdf'
  if (-not (Test-Path -LiteralPath $pdfPath -PathType Leaf)) { return 'href="#privacy"' }
  $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pdfPath))
  return ('href="data:application/pdf;base64,{0}"' -f $base64)
})
$html = [regex]::Replace($html, "@font-face\\{[^}]*url\\('fonts/[^']+'\\)[^}]*\\}", '')
$html = [regex]::Replace($html, '<button class="plan( active)?"(?![^>]*onclick)', '$& type="button" onclick="window.selectPlan(this)"')
$html = [regex]::Replace($html, 'onclick="window\.selectPlan\(this\)"(?![^>]*ontouchstart)', '$& ontouchstart="window.selectPlan(this)"')
$html = [regex]::Replace($html, '<a class="privacy-pdf" href="data:application/pdf;base64,[^"]*">', '<a class="privacy-pdf" href="./privacy-policy.pdf" target="_blank" rel="noopener">')
$planMarkup = @'
<input class="plan-radio" id="plan-1" type="radio" name="pricing-period" checked>
<input class="plan-radio" id="plan-6" type="radio" name="pricing-period">
<input class="plan-radio" id="plan-12" type="radio" name="pricing-period">
<div class="plans"><label class="plan active" for="plan-1" data-price="299 ₽" data-note="299 ₽ / месяц" data-saving="Без скидки"><span>1 месяц</span><b>299 ₽</b><small>299 ₽ / месяц</small></label><label class="plan" for="plan-6" data-price="1 599 ₽" data-note="266 ₽ / месяц" data-saving="Экономия 11%"><span>6 месяцев</span><b>1 599 ₽</b><small>266 ₽ / месяц</small><em>−11%</em></label><label class="plan" for="plan-12" data-price="2 999 ₽" data-note="250 ₽ / месяц" data-saving="Экономия 16%"><span>12 месяцев</span><b>2 999 ₽</b><small>250 ₽ / месяц</small><em>−16%</em></label></div><div class="selected-plan"><span id="planSaving">Без скидки</span><strong id="planPrice">299 ₽</strong><small id="planNote">299 ₽ / месяц</small></div>
'@
$html = [regex]::Replace($html, '(?s)<div class="plans">.*?</div><div class="selected-plan">.*?</div>', $planMarkup, 1)
$fallbackCss = @'
<style id="plan-no-js-fallback">
.plan-radio{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.plan-radio:focus-visible + .plan-radio + .plan-radio + .plans label[for]{outline:2px solid var(--brand);outline-offset:3px}
#plan-1:checked ~ .plans label[for="plan-1"],#plan-6:checked ~ .plans label[for="plan-6"],#plan-12:checked ~ .plans label[for="plan-12"]{border:2px solid var(--brand)!important;padding:11px 9px}
#plan-6:checked ~ .selected-plan #planSaving,#plan-12:checked ~ .selected-plan #planSaving,#plan-6:checked ~ .selected-plan #planPrice,#plan-12:checked ~ .selected-plan #planPrice,#plan-6:checked ~ .selected-plan #planNote,#plan-12:checked ~ .selected-plan #planNote{font-size:0!important}
#plan-6:checked ~ .selected-plan #planSaving:after{content:'Экономия 11%';font-size:14px}
#plan-12:checked ~ .selected-plan #planSaving:after{content:'Экономия 16%';font-size:14px}
#plan-6:checked ~ .selected-plan #planPrice:after{content:'1 599 ₽';font-size:34px}
#plan-12:checked ~ .selected-plan #planPrice:after{content:'2 999 ₽';font-size:34px}
#plan-6:checked ~ .selected-plan #planNote:after{content:'за 6 месяцев · ≈ 266 ₽ / месяц';font-size:14px}
#plan-12:checked ~ .selected-plan #planNote:after{content:'за 12 месяцев · ≈ 250 ₽ / месяц';font-size:14px}
</style>
'@
$html = $html.Replace('</head>', "$fallbackCss`r`n</head>")
$html = $html.Replace('</script>', "window.selectPlan = applyPlan;`r`n</script>")
[IO.File]::WriteAllText($target, $html, [Text.UTF8Encoding]::new($false))
Write-Output $target
