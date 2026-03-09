import { app, G, S, cv, cx, gradCV, LOGO, SYS_FONT, MX, TOP_PAD, FOOTER_H, IMG_GAP, IMG_TOP_GAP, IMG_MIN_H, HL_MIN_FS, HL_MAX_LINES, SUB_MAX_LINES, HL_LINE_H_FACTOR, SUB_LINE_H_FACTOR, FOOTER_FS, FOOTER_BOTTOM, LOGO_H, SAFE_ZONE_RATIO, $pv, $ph, $z, $cr, $sz, $sx, $sy, $vz, $vx, $vy, $cc, $swapBtn, $cr0Wrap, $cr1Wrap, $cropHint } from './state.js';

// ===== RAF THROTTLE =====
function scheduleDraw() {
  if (G.rafPending || G._exportLock) return;
  G.rafPending = true;
  requestAnimationFrame(function() {
    G.rafPending = false;
    if (!G._exportLock) draw();
  });
}

// ===== WORD WRAP =====
var _mtCache = {};
var _mtCacheFont = '';
var _mtCacheSize = 0;
var _MT_CACHE_MAX = 500;
function cachedMeasure(text) {
  var font = cx.font;
  if (font !== _mtCacheFont) { _mtCache = {}; _mtCacheFont = font; _mtCacheSize = 0; }
  if (text in _mtCache) return _mtCache[text];
  var w = cx.measureText(text).width;
  if (_mtCacheSize < _MT_CACHE_MAX) { _mtCache[text] = w; _mtCacheSize++; }
  return w;
}
function wrapLine(text, fs, maxWidth) {
  cx.font = 'bold ' + fs + 'px Festivo, serif';
  if (cachedMeasure(text) <= maxWidth) return [text];
  var words = text.split(' ');
  var lines = [], cur = '';
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    if (cachedMeasure(word) > maxWidth) {
      if (cur) { lines.push(cur); cur = ''; }
      var chars = '';
      for (var c = 0; c < word.length; c++) {
        var next = chars + word[c];
        if (cachedMeasure(next) > maxWidth && chars) {
          lines.push(chars); chars = word[c];
        } else { chars = next; }
      }
      cur = chars;
      continue;
    }
    var test = cur ? cur + ' ' + word : word;
    if (cachedMeasure(test) > maxWidth && cur) {
      lines.push(cur); cur = word;
    } else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===== UI SYNC =====
function hasTwoImages() { return S.layout === 'two' || S.layout === 'stacked'; }
function updateCropVis() {
  var show0 = S.layout !== 'none' && S.imgs[0];
  var show1 = hasTwoImages() && S.imgs[1];
  $cc[0].style.display = show0 ? 'block' : 'none';
  $cc[1].style.display = show1 ? 'block' : 'none';
  $cropHint.style.display = (!show0 && !show1) ? 'block' : 'none';
  $cr0Wrap.style.display = (S.layout !== 'none') ? 'block' : 'none';
  $cr1Wrap.style.display = hasTwoImages() ? 'block' : 'none';
}
function updateSwapBtn() {
  $swapBtn.classList.toggle('show', !!(hasTwoImages() && S.imgs[0] && S.imgs[1]));
}
function renderUI() {
  for (var i = 0; i < 2; i++) {
    if (S.imgs[i]) {
      $pv[i].src = S.blobs[i] || S.imgs[i].src;
      $pv[i].style.display = 'block';
      $ph[i].style.display = 'none';
      $z[i].classList.add('has');
    } else {
      $pv[i].style.display = 'none';
      $ph[i].style.display = 'block';
      $z[i].classList.remove('has');
    }
    $cr[i].value = S.creds[i];
    $sz[i].value = S.crop[i].z;
    $vz[i].textContent = S.crop[i].z + '%';
    $sx[i].value = S.crop[i].x;
    $vx[i].textContent = S.crop[i].x + '%';
    $sy[i].value = S.crop[i].y;
    $vy[i].textContent = S.crop[i].y + '%';
    var flipBtn = document.querySelector('.crop-flip[data-img="' + i + '"]');
    if (flipBtn) flipBtn.classList.toggle('on', !!S.crop[i].flip);
    var chGroup = document.querySelector('.ch-btns[data-img="' + i + '"]');
    if (chGroup) {
      var ch = S.crop[i].cropH || 100;
      chGroup.querySelectorAll('.ch-btn').forEach(function(b) {
        b.classList.toggle('on', +b.getAttribute('data-val') === ch);
      });
    }
  }
  updateCropVis();
  updateSwapBtn();
  scheduleDraw();
}

// ===== DRAW HELPERS =====
function prepareText(maxW) {
  var W = G.W, H = G.H;
  cx.save();
  var headlineText = S.hlLines.join('\n');
  if (S.hlCaps) headlineText = headlineText.toUpperCase();
  var isNone = (S.layout === 'none');
  var isStacked = (S.layout === 'stacked');
  var isLandscape = W > H;
  var hlFS, subFS;
  if (isNone && isLandscape) { hlFS = S.hlLines.length > 1 ? 140 : 160; subFS = 60; }
  else if (isNone) { hlFS = S.hlLines.length > 1 ? 230 : 260; subFS = 90; }
  else if (isStacked && isLandscape) { hlFS = S.hlLines.length > 1 ? 64 : 74; subFS = 36; }
  else if (isLandscape) { hlFS = S.hlLines.length > 1 ? 78 : 88; subFS = 42; }
  else if (isStacked) { hlFS = S.hlLines.length > 1 ? 110 : 120; subFS = 54; }
  else { hlFS = S.hlLines.length > 1 ? 120 : 130; subFS = 60; }
  if (S.hlFSOverride > 0) hlFS = S.hlFSOverride;
  if (S.subFSOverride > 0) subFS = S.subFSOverride;
  var rawLines = headlineText.split('\n');
  cx.font = 'bold ' + hlFS + 'px Festivo, serif';
  var worstRatio = 1;
  if (S.hlFSOverride > 0) {
    for (var ki = 0; ki < rawLines.length; ki++) {
      var words = rawLines[ki].split(' ');
      for (var wi = 0; wi < words.length; wi++) {
        var ww = cachedMeasure(words[wi]);
        if (ww > maxW) { var ratio = maxW / ww; if (ratio < worstRatio) worstRatio = ratio; }
      }
    }
  } else {
    for (var kj = 0; kj < rawLines.length; kj++) {
      var mw = cachedMeasure(rawLines[kj]);
      if (mw > maxW) { var ratio = maxW / mw; if (ratio < worstRatio) worstRatio = ratio; }
    }
  }
  if (worstRatio < 1) {
    hlFS = Math.max(Math.floor(hlFS * worstRatio), isLandscape ? 60 : HL_MIN_FS);
  }
  var hlArr = [];
  for (var r = 0; r < rawLines.length; r++) {
    var wrapped = wrapLine(rawLines[r], hlFS, maxW);
    for (var wr = 0; wr < wrapped.length && hlArr.length < HL_MAX_LINES; wr++) {
      hlArr.push(wrapped[wr]);
    }
  }
  var subArr = [];
  if (S.subText) {
    var subTextFinal = S.subCaps ? S.subText.toUpperCase() : S.subText;
    var subLines = subTextFinal.split('\n').filter(function(l) { return l.length > 0; });
    for (var si = 0; si < subLines.length && subArr.length < SUB_MAX_LINES; si++) {
      var wSub = wrapLine(subLines[si], subFS, maxW);
      for (var ws = 0; ws < wSub.length && subArr.length < SUB_MAX_LINES; ws++) {
        subArr.push(wSub[ws]);
      }
    }
  }
  cx.restore();
  return { hlArr: hlArr, hlFS: hlFS, subArr: subArr, subFS: subFS, isNone: isNone, isLandscape: isLandscape };
}

function drawText(t, maxW) {
  var W = G.W, H = G.H;
  var hlLineH = Math.round(t.hlFS * HL_LINE_H_FACTOR);
  var hlBlockH = t.hlArr.length * hlLineH;
  var subLineH = Math.round(t.subFS * SUB_LINE_H_FACTOR);
  var subBlockH = t.subArr.length > 0 ? t.subArr.length * subLineH : 0;
  var subGap = t.isNone ? (t.isLandscape ? 12 : 20) : t.isLandscape ? 8 : 14;
  var curY;
  var topPad = t.isLandscape ? 36 : TOP_PAD;
  var footerH = t.isLandscape ? 70 : FOOTER_H;
  var totalH = hlBlockH + (subBlockH > 0 ? subGap + subBlockH : 0);
  if (S.textPos === 'center') {
    var availH = H - topPad - footerH;
    curY = topPad + Math.round((availH - totalH) / 2);
  } else if (S.textPos === 'bottom') {
    curY = H - footerH - totalH - (t.isLandscape ? 14 : IMG_TOP_GAP);
  } else if (t.isNone) {
    var availH2 = H - topPad - footerH;
    curY = topPad + Math.round((availH2 - totalH) / 2);
  } else {
    curY = topPad;
  }
  cx.font = 'bold ' + t.hlFS + 'px Festivo, serif';
  cx.fillStyle = '#ffffff';
  cx.textBaseline = 'top';
  cx.textAlign = 'center';
  var centerX = W / 2;
  for (var li = 0; li < t.hlArr.length; li++) {
    cx.fillText(t.hlArr[li], centerX, curY + li * hlLineH);
  }
  curY += hlBlockH;
  if (t.subArr.length > 0) {
    curY += subGap;
    cx.font = '700 ' + t.subFS + 'px Festivo, serif';
    cx.fillStyle = 'rgba(210,225,240,0.9)';
    for (var sj = 0; sj < t.subArr.length; sj++) {
      cx.fillText(t.subArr[sj], centerX, curY + sj * subLineH);
    }
    curY += t.subArr.length * subLineH;
  }
  cx.textAlign = 'left';
  return curY;
}

function drawImages(curY) {
  var W = G.W, H = G.H;
  var isLandscape = W > H;
  var imgTopGap = isLandscape ? 14 : IMG_TOP_GAP;
  var footerH = isLandscape ? 70 : FOOTER_H;
  var imgTop = curY + imgTopGap;
  var imgH = Math.max(H - footerH - imgTop, IMG_MIN_H);
  var fullW = W - MX * 2;
  if (S.layout === 'two') {
    var imgW = Math.round((fullW - IMG_GAP) / 2);
    drawCroppedImage(0, MX, imgTop, imgW, imgH);
    drawCroppedImage(1, MX + imgW + IMG_GAP, imgTop, imgW, imgH);
  } else if (S.layout === 'stacked') {
    var eachH = Math.max(Math.round((imgH - IMG_GAP) / 2), IMG_MIN_H);
    drawCroppedImage(0, MX, imgTop, fullW, eachH);
    drawCroppedImage(1, MX, imgTop + eachH + IMG_GAP, fullW, eachH);
  } else {
    drawCroppedImage(0, MX, imgTop, fullW, imgH);
  }
}

function drawImagesAtTop(t) {
  var W = G.W, H = G.H;
  var isLandscape = W > H;
  var topPad = isLandscape ? 36 : TOP_PAD;
  var footerH = isLandscape ? 70 : FOOTER_H;
  var imgTopGap = isLandscape ? 14 : IMG_TOP_GAP;
  var hlLineH = Math.round(t.hlFS * HL_LINE_H_FACTOR);
  var hlBlockH = t.hlArr.length * hlLineH;
  var subLineH = Math.round(t.subFS * SUB_LINE_H_FACTOR);
  var subBlockH = t.subArr.length > 0 ? t.subArr.length * subLineH : 0;
  var subGap = t.isNone ? (isLandscape ? 12 : 20) : isLandscape ? 8 : 14;
  var textBlockH = hlBlockH + (subBlockH > 0 ? subGap + subBlockH : 0);
  var imgTop = topPad;
  var imgH = Math.max(H - footerH - imgTop - imgTopGap - textBlockH - imgTopGap, IMG_MIN_H);
  var fullW = W - MX * 2;
  if (S.layout === 'two') {
    var imgW = Math.round((fullW - IMG_GAP) / 2);
    drawCroppedImage(0, MX, imgTop, imgW, imgH);
    drawCroppedImage(1, MX + imgW + IMG_GAP, imgTop, imgW, imgH);
  } else if (S.layout === 'stacked') {
    var eachH = Math.max(Math.round((imgH - IMG_GAP) / 2), IMG_MIN_H);
    drawCroppedImage(0, MX, imgTop, fullW, eachH);
    drawCroppedImage(1, MX, imgTop + eachH + IMG_GAP, fullW, eachH);
    return imgTop + eachH * 2 + IMG_GAP;
  } else {
    drawCroppedImage(0, MX, imgTop, fullW, imgH);
  }
  return imgTop + imgH;
}

function drawTextAtBottom(t, maxW, imgEndY) {
  var W = G.W, H = G.H;
  var isLandscape = W > H;
  var footerH = isLandscape ? 70 : FOOTER_H;
  var imgTopGap = isLandscape ? 14 : IMG_TOP_GAP;
  var hlLineH = Math.round(t.hlFS * HL_LINE_H_FACTOR);
  var hlBlockH = t.hlArr.length * hlLineH;
  var subLineH = Math.round(t.subFS * SUB_LINE_H_FACTOR);
  var subBlockH = t.subArr.length > 0 ? t.subArr.length * subLineH : 0;
  var subGap = t.isNone ? (isLandscape ? 12 : 20) : isLandscape ? 8 : 14;
  var totalH = hlBlockH + (subBlockH > 0 ? subGap + subBlockH : 0);
  var curY = H - footerH - totalH - imgTopGap;
  cx.font = 'bold ' + t.hlFS + 'px Festivo, serif';
  cx.fillStyle = '#ffffff';
  cx.textBaseline = 'top';
  cx.textAlign = 'center';
  var centerX = W / 2;
  for (var li = 0; li < t.hlArr.length; li++) {
    cx.fillText(t.hlArr[li], centerX, curY + li * hlLineH);
  }
  curY += hlBlockH;
  if (t.subArr.length > 0) {
    curY += subGap;
    cx.font = '700 ' + t.subFS + 'px Festivo, serif';
    cx.fillStyle = 'rgba(210,225,240,0.9)';
    for (var sj = 0; sj < t.subArr.length; sj++) {
      cx.fillText(t.subArr[sj], centerX, curY + sj * subLineH);
    }
  }
  cx.textAlign = 'left';
}

function drawFooter() {
  var W = G.W, H = G.H;
  var isLandscape = W > H;
  var fFS = isLandscape ? 28 : FOOTER_FS;
  var fBottom = isLandscape ? 20 : FOOTER_BOTTOM;
  var fLogoH = isLandscape ? 42 : LOGO_H;
  cx.textBaseline = 'bottom';
  cx.font = '500 ' + fFS + 'px Festivo, serif';
  cx.fillStyle = '#ffffff';
  cx.textAlign = 'center';
  cx.fillText('vandieken.com', W / 2, H - fBottom);
  cx.textAlign = 'left';
  cx.fillText(S.dateText, MX, H - fBottom);
  if (LOGO.complete && LOGO.naturalWidth > 0) {
    var lw = fLogoH * (LOGO.naturalWidth / LOGO.naturalHeight);
    cx.globalAlpha = 0.85;
    cx.drawImage(LOGO, W - MX - lw, H - fBottom - fLogoH + 6, lw, fLogoH);
    cx.globalAlpha = 1;
  }
  cx.textBaseline = 'alphabetic';
  cx.textAlign = 'left';
}

// ===== DRAW =====
function baseDraw() {
  var W = G.W, H = G.H;
  cx.drawImage(gradCV, 0, 0, 1, H, 0, 0, W, H);
  var maxW = W - MX * 2;
  var t = prepareText(maxW);
  if (S.textPos === 'bottom' && !t.isNone) {
    var imgEndY = drawImagesAtTop(t);
    drawTextAtBottom(t, maxW, imgEndY);
  } else {
    var curY = drawText(t, maxW);
    if (!t.isNone) drawImages(curY);
  }
  drawFooter();
}

// draw() is the public draw function — enhanced by carousel for safe zone + thumb updates
function draw() {
  baseDraw();
  // Safe zone overlay
  if (G.showSafeZone) {
    var W = G.W, H = G.H;
    var szH = Math.round(H * SAFE_ZONE_RATIO);
    var szY = H - szH;
    cx.fillStyle = 'rgba(255, 60, 60, 0.13)';
    cx.fillRect(0, szY, W, szH);
    cx.save();
    cx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    cx.lineWidth = 2;
    cx.setLineDash([12, 6]);
    cx.beginPath();
    cx.moveTo(0, szY);
    cx.lineTo(W, szY);
    cx.stroke();
    cx.setLineDash([]);
    cx.font = '500 22px ' + SYS_FONT;
    cx.fillStyle = 'rgba(255, 80, 80, 0.7)';
    cx.textAlign = 'left';
    cx.textBaseline = 'top';
    cx.fillText('LinkedIn Safe Zone', MX, szY + 6);
    cx.restore();
  }
  // Notify carousel for thumb update
  if (app.onDraw) app.onDraw();
}

function drawCroppedImage(idx, dx, dy, dw, dh) {
  var W = G.W;
  var img = S.imgs[idx];
  if (!img) {
    cx.save();
    cx.fillStyle = '#f0f0f0';
    cx.fillRect(dx, dy, dw, dh);
    cx.fillStyle = '#bbb';
    cx.font = '600 28px ' + SYS_FONT;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('Bild ' + (idx + 1), dx + dw / 2, dy + dh / 2);
    cx.restore();
    return;
  }
  var crop = S.crop[idx];
  var ch = (crop.cropH || 100) / 100;
  if (ch < 1) {
    var trimmed = dh * (1 - ch);
    dy += trimmed / 2;
    dh = dh * ch;
  }
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var fillScale = Math.max(dw / iw, dh / ih);
  var scale = fillScale * (crop.z / 100);
  var drawW = iw * scale;
  var drawH = ih * scale;
  var overflowX = drawW - dw;
  var overflowY = drawH - dh;
  var imgX = dx - overflowX * (crop.x / 100);
  var imgY = dy - overflowY * (crop.y / 100);
  cx.save();
  cx.beginPath();
  cx.rect(dx, dy, dw, dh);
  cx.clip();
  if (crop.flip) {
    cx.translate(dx + dw, 0);
    cx.scale(-1, 1);
    cx.drawImage(img, dx + dw - imgX - drawW, imgY, drawW, drawH);
  } else {
    cx.drawImage(img, imgX, imgY, drawW, drawH);
  }
  cx.restore();
  if (S.creds[idx]) {
    cx.save();
    var credFS = S.credFSOverride > 0 ? S.credFSOverride : Math.max(16, Math.round(dh * 0.04));
    cx.font = '500 ' + credFS + 'px Cambria,"Times New Roman",serif';
    cx.fillStyle = 'rgba(255,255,255,0.85)';
    var align = S.credAlign || 'right';
    var credX, pad = 10;
    if (align === 'left') { cx.textAlign = 'left'; credX = dx + pad; }
    else if (align === 'center') { cx.textAlign = 'center'; credX = dx + dw / 2; }
    else { cx.textAlign = 'right'; credX = dx + dw - pad; }
    cx.textBaseline = 'bottom';
    if (S.credShadow) {
      cx.shadowColor = 'rgba(0,0,0,0.5)';
      cx.shadowBlur = 6;
      cx.shadowOffsetX = 1;
      cx.shadowOffsetY = 1;
    }
    cx.fillText(S.creds[idx], credX + (S.credOffX || 0), dy + dh - pad + (S.credOffY || 0));
    cx.restore();
  }
}

// ===== REGISTER ON APP =====
app.draw = draw;
app.baseDraw = baseDraw;
app.scheduleDraw = scheduleDraw;
app.renderUI = renderUI;
app.hasTwoImages = hasTwoImages;
app.updateCropVis = updateCropVis;
app.updateSwapBtn = updateSwapBtn;
