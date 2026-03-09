import { app, G, S, FORMATS, defaultCrop, todayDE, todayISO, isoToDE, deToISO, cv,
  setSaveLabel, rebuildGradient,
  $hl, $sub, $date, $EP, $bSave, $bSaveArrow, $saveMenu, $bC, $bS, $bN,
  $togHlCaps, $togSubCaps, $swapBtn,
  $lbTwo, $lbStacked, $lbOne, $lbNone, $imgEd,
  $hlCount, $subCount, $hint, $fmtBtns, $btnSafeZone,
  $z, $pv, $ph, $f, $rm, $cr, $sz, $sx, $sy, $vz, $vx, $vy,
  $fsSlider, $fsVal, $fsReset,
  $subFsSlider, $subFsVal, $subFsReset,
  $credFsSlider, $credFsVal, $credFsReset,
  $tpTop, $tpCenter, $tpBottom,
  $caLeft, $caRight, $caCenter,
  $credOffXSlider, $credOffXVal, $credOffXReset,
  $credOffYSlider, $credOffYVal, $credOffYReset,
  $credShadowToggle,
  $dropOverlay,
  $tplSelect, $tplLoad, $tplDel, $tplName, $tplSave,
  $bA, $bASaveLabel, $bSaveCopy, $bH,
  $histOverlay, $histDrawer, $histClose, $histBody, $histEmpty, $histGrid,
  $histFilterAll, $histFilterSingle, $histFilterCarousel,
  $deckBar, $tabSingle, $tabCarousel, $appDiv } from './state.js';

// ===== NEW POST =====
$bN.addEventListener('click', function() {
  var hasContent = false;
  if (G.deckActive && G.deck.length > 0) {
    app.saveCurrentSlide();
    for (var ci = 0; ci < G.deck.length; ci++) {
      var ds = G.deck[ci];
      if (ds.imgs[0] || ds.imgs[1] || ds.hlLines.join('').trim() || ds.subText.trim()) {
        hasContent = true; break;
      }
    }
  } else {
    hasContent = S.imgs[0] || S.imgs[1] || S.hlLines.join('').trim() || S.subText.trim();
  }
  var msg = G.deckActive
    ? 'Karussell mit ' + G.deck.length + ' Slides verwerfen und neu beginnen?'
    : 'Aktuellen Post verwerfen und neu beginnen?';
  if (hasContent && !confirm(msg)) return;
  app.setToolMode('single', true);
  app.revokeBlob(0); app.revokeBlob(1);
  S.imgs = [null, null]; S.blobs = [null, null]; S.draftBlobs = [null, null]; S.creds = ['', ''];
  S.crop = [defaultCrop(), defaultCrop()]; S.hlCaps = false; S.subCaps = false;
  S.hlLines = ['']; S.subText = '';
  S.dateText = todayDE();
  S.hlFSOverride = 0; S.subFSOverride = 0; S.credFSOverride = 0;
  S.credAlign = 'right'; S.credOffX = 0; S.credOffY = 0; S.credShadow = false; S.textPos = 'top';
  $hl.value = ''; $sub.value = ''; $date.value = todayISO();
  $togHlCaps.classList.remove('on'); $togHlCaps.setAttribute('aria-checked', 'false');
  $togSubCaps.classList.remove('on'); $togSubCaps.setAttribute('aria-checked', 'false');
  $f[0].value = ''; $f[1].value = '';
  setLayout('one');
  setFormat('4:5');
  updateFSSlider();
  Object.keys(CA_BTNS).forEach(function(k) {
    CA_BTNS[k].classList.toggle('on', k === 'right');
    CA_BTNS[k].setAttribute('aria-checked', String(k === 'right'));
  });
  updateCredOffsetUI();
  Object.keys(TP_BTNS).forEach(function(k) {
    TP_BTNS[k].classList.toggle('on', k === 'top');
    TP_BTNS[k].setAttribute('aria-checked', String(k === 'top'));
  });
  app.autoSize($hl);
  app.renderUI();
  app.saveState();
  app.deleteDraft();
  $bN.textContent = '\u2713 Zur\u00fcckgesetzt';
  $bN.classList.add('btn-success-outline');
  app.showToast('\u2713 Neuer Post \u2013 alles zur\u00fcckgesetzt');
  setTimeout(function() {
    $bN.textContent = 'Neu';
    $bN.classList.remove('btn-success-outline');
  }, 1500);
});

// ===== SPLIT SAVE BUTTON =====
function updateSaveBtn() {
  var label = G.saveFmt === 'jpg' ? 'JPG speichern' : 'PNG speichern';
  $bSave.textContent = label;
  $bSave.setAttribute('aria-label', 'Als ' + G.saveFmt.toUpperCase() + ' speichern');
  var opts = $saveMenu.querySelectorAll('.split-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].getAttribute('data-fmt') === G.saveFmt);
  }
}
updateSaveBtn();
$bSaveArrow.addEventListener('click', function(e) {
  e.stopPropagation();
  var isOpen = $saveMenu.classList.toggle('open');
  $bSaveArrow.setAttribute('aria-expanded', String(isOpen));
});
$saveMenu.addEventListener('click', function(e) {
  var opt = e.target.closest('.split-opt');
  if (!opt) return;
  G.saveFmt = opt.getAttribute('data-fmt');
  try { localStorage.setItem('ki-save-fmt', G.saveFmt); } catch(e2) {}
  updateSaveBtn();
  $saveMenu.classList.remove('open');
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#saveGroup')) {
    $saveMenu.classList.remove('open');
    $bSaveArrow.setAttribute('aria-expanded', 'false');
  }
});

// Download export
$bSave.addEventListener('click', function() {
  if (!S.imgs[0] && !S.imgs[1]) { app.showToast('\u26a0 Bitte mindestens ein Bild hinzuf\u00fcgen'); return; }
  if (!G.fontReady && !confirm('Font nicht geladen \u2013 Export k\u00f6nnte fehlerhaft aussehen. Trotzdem exportieren?')) return;
  var btn = this;
  var isJpg = G.saveFmt === 'jpg';
  var mime = isJpg ? 'image/jpeg' : 'image/png';
  var ext = isJpg ? '.jpg' : '.png';
  var fmtLabel = isJpg ? 'JPG' : 'PNG';
  var defaultLabel = fmtLabel + ' speichern';
  btn.disabled = true; setSaveLabel('Speichert\u2026');
  app.draw();
  var args = [function(blob) {
    if (!blob) {
      btn.disabled = false; btn.textContent = defaultLabel;
      app.showToast('\u26a0 Export fehlgeschlagen');
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.download = 'ki-news-' + new Date().toISOString().slice(0, 16).replace(':', '-') + ext;
    a.href = url;
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    btn.textContent = '\u2713 Gespeichert!';
    btn.classList.add('btn-success');
    app.showToast('\u2713 ' + fmtLabel + ' in Downloads gespeichert');
    setTimeout(function() {
      btn.disabled = false;
      btn.textContent = defaultLabel;
      btn.classList.remove('btn-success');
    }, 1500);
  }, mime];
  if (isJpg) args.push(0.95);
  cv.toBlob.apply(cv, args);
});

// Web Share API
$bS.addEventListener('click', function() {
  var btn = this;
  btn.disabled = true; btn.textContent = 'Teilen\u2026';
  app.draw();
  cv.toBlob(function(blob) {
    if (!blob) {
      btn.disabled = false; btn.textContent = 'Teilen';
      app.showToast('\u26a0 Teilen fehlgeschlagen');
      return;
    }
    var file = new File([blob], 'ki-news-' + new Date().toISOString().slice(0, 16).replace(':', '-') + '.jpg', { type: 'image/jpeg' });
    navigator.share({ files: [file] }).catch(function(e) { if (e.name !== 'AbortError') console.warn('Share failed:', e); }).finally(function() {
      btn.disabled = false; btn.textContent = 'Teilen';
    });
  }, 'image/jpeg', 0.95);
});

// Copy to clipboard
$bC.addEventListener('click', function() {
  var btn = this;
  btn.disabled = true; btn.textContent = 'Kopiert\u2026';
  app.draw();
  cv.toBlob(function(blob) {
    if (!blob) {
      btn.disabled = false; btn.textContent = 'Kopieren';
      app.showToast('\u26a0 Kopieren fehlgeschlagen');
      return;
    }
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function() {
      btn.textContent = '\u2713 Kopiert!';
      btn.classList.add('btn-success');
      app.showToast('\u2713 Bild in Zwischenablage kopiert');
      setTimeout(function() {
        btn.disabled = false;
        btn.textContent = 'Kopieren';
        btn.classList.remove('btn-success');
      }, 1500);
    }).catch(function() {
      btn.disabled = false; btn.textContent = 'Kopieren';
      app.showToast('\u26a0 Kopieren fehlgeschlagen');
    });
  }, 'image/png');
});

// ALL CAPS toggles
$togHlCaps.addEventListener('click', function() {
  S.hlCaps = !S.hlCaps;
  this.classList.toggle('on', S.hlCaps);
  this.setAttribute('aria-checked', String(S.hlCaps));
  pushUndo();
  app.saveState();
  app.scheduleDraw();
});
$togSubCaps.addEventListener('click', function() {
  S.subCaps = !S.subCaps;
  this.classList.toggle('on', S.subCaps);
  this.setAttribute('aria-checked', String(S.subCaps));
  pushUndo();
  app.saveState();
  app.scheduleDraw();
});

// Headline input
$hl.addEventListener('input', function() {
  var parts = this.value.split('\n');
  if (parts.length > 3) { parts = parts.slice(0, 3); this.value = parts.join('\n'); }
  S.hlLines = this.value.split('\n').filter(function(l) { return l.length > 0; });
  if (S.hlLines.length === 0) S.hlLines = [''];
  app.updateCharCount(this, $hlCount, app.CHAR_LIMITS.hl[0], app.CHAR_LIMITS.hl[1]);
  app.autoSize(this);
  app.debouncedSave();
  app.scheduleDraw();
});

// Subtitle input
$sub.addEventListener('input', function() {
  var parts = this.value.split('\n');
  if (parts.length > 2) { parts = parts.slice(0, 2); this.value = parts.join('\n'); }
  S.subText = this.value;
  app.updateCharCount(this, $subCount, app.CHAR_LIMITS.sub[0], app.CHAR_LIMITS.sub[1]);
  app.autoSize(this);
  app.debouncedSave();
  app.scheduleDraw();
});

// Date input
$date.addEventListener('change', function() {
  S.dateText = this.value ? isoToDE(this.value) : '';
  app.debouncedSave();
  app.scheduleDraw();
});

// ===== LAYOUT BUTTONS =====
var LAYOUT_BTNS = { two: $lbTwo, stacked: $lbStacked, one: $lbOne, none: $lbNone };
function setLayout(l) {
  S.layout = l;
  Object.keys(LAYOUT_BTNS).forEach(function(k) {
    LAYOUT_BTNS[k].classList.toggle('on', k === l);
    LAYOUT_BTNS[k].setAttribute('aria-checked', String(k === l));
  });
  var hasTwoImgs = (l === 'two' || l === 'stacked');
  $imgEd.style.display = (l === 'none') ? 'none' : 'block';
  $z[1].style.display = hasTwoImgs ? 'flex' : 'none';
  var zones = document.querySelector('.img-zones');
  if (zones) zones.style.flexDirection = (l === 'stacked') ? 'column' : '';
  $swapBtn.classList.toggle('vertical', l === 'stacked');
  app.updateCropVis();
  app.updateSwapBtn();
  app.refreshCounts();
  app.saveState();
  app.scheduleDraw();
}

$lbTwo.addEventListener('click',     function() { setLayout('two'); });
$lbStacked.addEventListener('click', function() { setLayout('stacked'); });
$lbOne.addEventListener('click',     function() { setLayout('one'); });
$lbNone.addEventListener('click',    function() { setLayout('none'); });

// ===== FORMAT BUTTONS =====
function setFormat(fmt) {
  S.format = fmt;
  var f = FORMATS[fmt];
  if (G.W !== f.w || G.H !== f.h) {
    G.W = f.w; G.H = f.h;
    cv.width = G.W; cv.height = G.H;
    rebuildGradient();
  }
  for (var i = 0; i < $fmtBtns.length; i++) {
    var isOn = $fmtBtns[i].getAttribute('data-fmt') === fmt;
    $fmtBtns[i].classList.toggle('on', isOn);
    $fmtBtns[i].setAttribute('aria-checked', String(isOn));
  }
  $hint.textContent = fmt + ' Format \u00b7 ' + G.W + ' \u00d7 ' + G.H + ' px';
  app.refreshCounts();
  app.saveState();
  app.scheduleDraw();
}
for (var fi = 0; fi < $fmtBtns.length; fi++) {
  $fmtBtns[fi].addEventListener('click', function() {
    setFormat(this.getAttribute('data-fmt'));
  });
}

// LinkedIn Safe Zone toggle
$btnSafeZone.addEventListener('click', function() {
  G.showSafeZone = !G.showSafeZone;
  this.classList.toggle('on', G.showSafeZone);
  this.setAttribute('aria-checked', String(G.showSafeZone));
  app.scheduleDraw();
});

// Swap button
$swapBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  var t;
  t = S.imgs[0];  S.imgs[0]  = S.imgs[1];  S.imgs[1]  = t;
  t = S.blobs[0]; S.blobs[0] = S.blobs[1]; S.blobs[1] = t;
  t = S.creds[0]; S.creds[0] = S.creds[1]; S.creds[1] = t;
  t = S.crop[0];  S.crop[0]  = S.crop[1];  S.crop[1]  = t;
  app.saveState();
  app.renderUI();
  app.saveDraft();
});

// ===== IMAGE LOADING =====
var MAX_IMAGE_SIZE = 8 * 1024 * 1024;
function loadImageFile(i, file) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    if (file) app.showToast('\u26a0 Nur JPG, PNG, WebP oder GIF');
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    app.showToast('\u26a0 Bild zu gro\u00df (max. 8 MB)');
    return;
  }
  app.revokeBlob(i);
  var blobUrl = URL.createObjectURL(file);
  var im = new Image();
  im.onload = function() {
    S.imgs[i] = im;
    S.blobs[i] = blobUrl;
    S.crop[i] = defaultCrop();
    app.compressImage(im, 2000, 0.85).then(function(blob) {
      S.draftBlobs[i] = blob;
      app.saveDraft();
    }).catch(function() {
      S.draftBlobs[i] = null;
      app.saveDraft();
    });
    app.renderUI();
  };
  im.onerror = function() {
    URL.revokeObjectURL(blobUrl);
    app.showToast('\u26a0 Bild konnte nicht geladen werden');
    $f[i].value = '';
  };
  im.src = blobUrl;
}

// Image zones + crop sliders + credit inputs
[0, 1].forEach(function(i) {
  function openFilePicker() { $f[i].click(); }
  $z[i].addEventListener('click', function(e) {
    if (e.target === $rm[i]) return;
    openFilePicker();
  });
  $z[i].addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); }
  });
  $f[i].addEventListener('change', function() { loadImageFile(i, this.files[0]); });
  // Drag & Drop
  $z[i].addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); this.classList.add('dragover'); });
  $z[i].addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); this.classList.remove('dragover'); });
  $z[i].addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.remove('dragover');
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImageFile(i, file);
  });
  // Remove image
  $rm[i].addEventListener('click', function(e) {
    e.stopPropagation();
    app.revokeBlob(i);
    S.imgs[i] = null; S.creds[i] = ''; S.crop[i] = defaultCrop();
    $f[i].value = '';
    app.saveState();
    app.renderUI();
    app.saveDraft();
  });
  // Crop sliders
  $sz[i].addEventListener('input', function() { S.crop[i].z = +this.value; $vz[i].textContent = this.value + '%'; app.scheduleDraw(); });
  $sz[i].addEventListener('change', function() { app.saveDraft(); });
  $sx[i].addEventListener('input', function() { S.crop[i].x = +this.value; $vx[i].textContent = this.value + '%'; app.scheduleDraw(); });
  $sx[i].addEventListener('change', function() { app.saveDraft(); });
  $sy[i].addEventListener('input', function() { S.crop[i].y = +this.value; $vy[i].textContent = this.value + '%'; app.scheduleDraw(); });
  $sy[i].addEventListener('change', function() { app.saveDraft(); });
  // Credit input
  $cr[i].addEventListener('input', function() { S.creds[i] = this.value; app.debouncedSave(); app.saveDraft(); app.scheduleDraw(); });
});

// ===== GLOBAL DRAG & DROP =====
var dragCounter = 0;
document.addEventListener('dragover', function(e) { e.preventDefault(); });
document.addEventListener('dragenter', function(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
    dragCounter++;
    $dropOverlay.classList.add('show');
  }
});
document.addEventListener('dragleave', function(e) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; $dropOverlay.classList.remove('show'); }
});
document.addEventListener('drop', function(e) {
  e.preventDefault();
  dragCounter = 0;
  $dropOverlay.classList.remove('show');
  var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file || !/^image\//.test(file.type)) return;
  var slot = 0;
  if (app.hasTwoImages() && S.imgs[0] && !S.imgs[1]) slot = 1;
  loadImageFile(slot, file);
});

// ===== FONT SIZE SLIDERS =====
function updateFSSlider() {
  if (S.hlFSOverride > 0) {
    $fsSlider.value = S.hlFSOverride;
    $fsVal.textContent = S.hlFSOverride + 'px';
  } else {
    $fsSlider.value = $fsSlider.min;
    $fsVal.textContent = 'Auto';
  }
  if (S.subFSOverride > 0) {
    $subFsSlider.value = S.subFSOverride;
    $subFsVal.textContent = S.subFSOverride + 'px';
  } else {
    $subFsSlider.value = $subFsSlider.min;
    $subFsVal.textContent = 'Auto';
  }
  if (S.credFSOverride > 0) {
    $credFsSlider.value = S.credFSOverride;
    $credFsVal.textContent = S.credFSOverride + 'px';
  } else {
    $credFsSlider.value = $credFsSlider.min;
    $credFsVal.textContent = 'Auto';
  }
}
$fsSlider.addEventListener('input', function() { S.hlFSOverride = +this.value; $fsVal.textContent = this.value + 'px'; app.debouncedSave(); app.scheduleDraw(); });
$fsSlider.addEventListener('change', function() { pushUndo(); });
$fsReset.addEventListener('click', function() { S.hlFSOverride = 0; updateFSSlider(); pushUndo(); app.debouncedSave(); app.scheduleDraw(); });
$subFsSlider.addEventListener('input', function() { S.subFSOverride = +this.value; $subFsVal.textContent = this.value + 'px'; app.debouncedSave(); app.scheduleDraw(); });
$subFsSlider.addEventListener('change', function() { pushUndo(); });
$subFsReset.addEventListener('click', function() { S.subFSOverride = 0; updateFSSlider(); pushUndo(); app.debouncedSave(); app.scheduleDraw(); });
$credFsSlider.addEventListener('input', function() { S.credFSOverride = +this.value; $credFsVal.textContent = this.value + 'px'; app.debouncedSave(); app.scheduleDraw(); });
$credFsSlider.addEventListener('change', function() { pushUndo(); });
$credFsReset.addEventListener('click', function() { S.credFSOverride = 0; updateFSSlider(); pushUndo(); app.debouncedSave(); app.scheduleDraw(); });

// ===== CROP RESET BUTTONS =====
document.querySelectorAll('.crop-reset').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var imgIdx = +this.getAttribute('data-img');
    var prop = this.getAttribute('data-prop');
    var defaults = {z: 100, x: 50, y: 50};
    S.crop[imgIdx][prop] = defaults[prop];
    var sliderMap = {z: $sz, x: $sx, y: $sy};
    var valMap = {z: $vz, x: $vx, y: $vy};
    sliderMap[prop][imgIdx].value = defaults[prop];
    valMap[prop][imgIdx].textContent = defaults[prop] + '%';
    app.saveDraft();
    app.scheduleDraw();
  });
});

// ===== FLIP BUTTONS =====
document.querySelectorAll('.crop-flip').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var imgIdx = +this.getAttribute('data-img');
    S.crop[imgIdx].flip = !S.crop[imgIdx].flip;
    this.classList.toggle('on', S.crop[imgIdx].flip);
    app.saveDraft();
    app.scheduleDraw();
  });
});

// ===== CROP HEIGHT BUTTONS =====
document.querySelectorAll('.ch-btns').forEach(function(group) {
  var imgIdx = +group.getAttribute('data-img');
  group.querySelectorAll('.ch-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var val = +this.getAttribute('data-val');
      S.crop[imgIdx].cropH = val;
      group.querySelectorAll('.ch-btn').forEach(function(b) {
        b.classList.toggle('on', +b.getAttribute('data-val') === val);
      });
      app.saveDraft();
      app.scheduleDraw();
    });
  });
});

// ===== TEXT POSITION =====
var TP_BTNS = { top: $tpTop, center: $tpCenter, bottom: $tpBottom };
function setTextPos(pos) {
  S.textPos = pos;
  Object.keys(TP_BTNS).forEach(function(k) {
    TP_BTNS[k].classList.toggle('on', k === pos);
    TP_BTNS[k].setAttribute('aria-checked', String(k === pos));
  });
  pushUndo();
  app.debouncedSave();
  app.scheduleDraw();
}
$tpTop.addEventListener('click', function() { setTextPos('top'); });
$tpCenter.addEventListener('click', function() { setTextPos('center'); });
$tpBottom.addEventListener('click', function() { setTextPos('bottom'); });

// ===== CREDIT ALIGNMENT =====
var CA_BTNS = { left: $caLeft, right: $caRight, center: $caCenter };
function setCredAlign(align) {
  S.credAlign = align;
  Object.keys(CA_BTNS).forEach(function(k) {
    CA_BTNS[k].classList.toggle('on', k === align);
    CA_BTNS[k].setAttribute('aria-checked', String(k === align));
  });
  pushUndo();
  app.debouncedSave();
  app.scheduleDraw();
}
$caLeft.addEventListener('click', function() { setCredAlign('left'); });
$caRight.addEventListener('click', function() { setCredAlign('right'); });
$caCenter.addEventListener('click', function() { setCredAlign('center'); });

function updateCredOffsetUI() {
  $credOffXSlider.value = S.credOffX;
  $credOffXVal.textContent = S.credOffX;
  $credOffYSlider.value = S.credOffY;
  $credOffYVal.textContent = S.credOffY;
  $credShadowToggle.classList.toggle('on', S.credShadow);
  $credShadowToggle.textContent = S.credShadow ? 'An' : 'Aus';
  $credShadowToggle.setAttribute('aria-checked', String(S.credShadow));
}
$credOffXSlider.addEventListener('input', function() { S.credOffX = parseInt(this.value, 10); $credOffXVal.textContent = S.credOffX; app.debouncedSave(); app.scheduleDraw(); });
$credOffXSlider.addEventListener('change', function() { pushUndo(); });
$credOffXReset.addEventListener('click', function() { S.credOffX = 0; updateCredOffsetUI(); pushUndo(); app.debouncedSave(); app.scheduleDraw(); });
$credOffYSlider.addEventListener('input', function() { S.credOffY = parseInt(this.value, 10); $credOffYVal.textContent = S.credOffY; app.debouncedSave(); app.scheduleDraw(); });
$credOffYSlider.addEventListener('change', function() { pushUndo(); });
$credOffYReset.addEventListener('click', function() { S.credOffY = 0; updateCredOffsetUI(); pushUndo(); app.debouncedSave(); app.scheduleDraw(); });

// ===== CREDIT SHADOW TOGGLE =====
function updateShadowBtn() {
  $credShadowToggle.classList.toggle('on', S.credShadow);
  $credShadowToggle.textContent = S.credShadow ? 'An' : 'Aus';
  $credShadowToggle.setAttribute('aria-checked', String(S.credShadow));
}
$credShadowToggle.addEventListener('click', function() {
  S.credShadow = !S.credShadow;
  updateShadowBtn();
  pushUndo(); app.debouncedSave(); app.scheduleDraw();
});

// ===== UNDO / REDO =====
var undoStack = [];
var redoStack = [];
var MAX_UNDO = 40;
function stateSnapshot() {
  return {
    json: JSON.stringify({
      hlLines: S.hlLines, subText: S.subText, dateText: S.dateText,
      hlCaps: S.hlCaps, subCaps: S.subCaps, layout: S.layout, format: S.format,
      creds: S.creds, crop: S.crop,
      hlFSOverride: S.hlFSOverride, subFSOverride: S.subFSOverride, credFSOverride: S.credFSOverride,
      credAlign: S.credAlign, credOffX: S.credOffX, credOffY: S.credOffY, credShadow: S.credShadow, textPos: S.textPos
    }),
    imgs: S.imgs.slice(),
    blobs: S.blobs.slice(),
    draftBlobs: S.draftBlobs.slice()
  };
}
function snapshotsEqual(a, b) {
  if (a.json !== b.json) return false;
  for (var si = 0; si < 2; si++) {
    var ai = a.imgs[si], bi = b.imgs[si];
    if (ai === bi) continue;
    if (!ai || !bi) return false;
    if (a.blobs[si] !== b.blobs[si]) return false;
  }
  return true;
}
function restoreSnapshot(snap) {
  var data;
  try { data = JSON.parse(snap.json); } catch(e) { app.showToast('\u26a0 Snapshot-Daten besch\u00e4digt'); return; }
  S.hlLines = data.hlLines; S.subText = data.subText; S.dateText = data.dateText;
  S.hlCaps = !!data.hlCaps; S.subCaps = !!data.subCaps;
  S.layout = data.layout; S.format = data.format;
  S.creds = data.creds; S.crop = data.crop;
  S.hlFSOverride = data.hlFSOverride || 0;
  S.subFSOverride = data.subFSOverride || 0;
  S.credFSOverride = data.credFSOverride || 0;
  S.credAlign = data.credAlign || 'right';
  S.credOffX = data.credOffX || 0;
  S.credOffY = data.credOffY || 0;
  S.credShadow = !!data.credShadow;
  S.textPos = data.textPos || 'top';
  S.imgs = snap.imgs.slice();
  S.blobs = snap.blobs.slice();
  S.draftBlobs = snap.draftBlobs.slice();
  app.refreshEditorFromState();
  for (var i = 0; i < 2; i++) {
    $cr[i].value = S.creds[i];
    $sz[i].value = S.crop[i].z; $vz[i].textContent = S.crop[i].z + '%';
    $sx[i].value = S.crop[i].x; $vx[i].textContent = S.crop[i].x + '%';
    $sy[i].value = S.crop[i].y; $vy[i].textContent = S.crop[i].y + '%';
  }
  app.saveState();
  app.scheduleDraw();
}
var lastSnap = null; // initialized in init
var _savedSnap = null; // initialized in init
function pushUndo() {
  if (!lastSnap) return;
  var snap = stateSnapshot();
  if (snapshotsEqual(snap, lastSnap)) return;
  undoStack.push(lastSnap);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  lastSnap = snap;
}
var _undoTimer = null;
function flushDebouncedUndo() {
  if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; pushUndo(); }
}
function undo() {
  flushDebouncedUndo();
  if (!undoStack.length) { app.showToast('Nichts zum R\u00fcckg\u00e4ngig machen'); return; }
  redoStack.push(stateSnapshot());
  var snap = undoStack.pop();
  lastSnap = snap;
  restoreSnapshot(snap);
  app.showToast('R\u00fcckg\u00e4ngig');
}
function redo() {
  if (!redoStack.length) { app.showToast('Nichts zum Wiederherstellen'); return; }
  undoStack.push(stateSnapshot());
  var snap = redoStack.pop();
  lastSnap = snap;
  restoreSnapshot(snap);
  app.showToast('Wiederhergestellt');
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  var tag = e.target.tagName;
  var isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
  if (e.key === 'Escape' && $saveMenu.classList.contains('open')) {
    $saveMenu.classList.remove('open');
    $bSaveArrow.setAttribute('aria-expanded', 'false');
    $bSaveArrow.focus();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    $bSave.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    if (isInput) return;
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    if (isInput) return;
    e.preventDefault();
    redo();
  }
});

// ===== TEMPLATE SYSTEM =====
var TPL_KEY = 'ki-news-templates';
function loadTemplates() {
  try {
    var raw = localStorage.getItem(TPL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}
function saveTemplates(templates) {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(templates)); } catch(e) {}
  app.syncTemplatesToCloud(templates);
}
function refreshTplSelect() {
  var templates = loadTemplates();
  var names = Object.keys(templates).sort();
  while ($tplSelect.firstChild) $tplSelect.removeChild($tplSelect.firstChild);
  var defOpt = document.createElement('option');
  defOpt.value = ''; defOpt.textContent = 'Vorlage w\u00e4hlen\u2026';
  $tplSelect.appendChild(defOpt);
  names.forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    $tplSelect.appendChild(opt);
  });
}
$tplSave.addEventListener('click', function() {
  var name = $tplName.value.trim().slice(0, 50);
  if (!name) { app.showToast('\u26a0 Bitte Vorlagenname eingeben'); return; }
  if (/[<>"'`\\\/]/.test(name)) { app.showToast('\u26a0 Sonderzeichen im Namen nicht erlaubt'); return; }
  var templates = loadTemplates();
  templates[name] = {
    layout: S.layout, format: S.format, hlCaps: S.hlCaps, subCaps: S.subCaps,
    hlFSOverride: S.hlFSOverride, subFSOverride: S.subFSOverride, credFSOverride: S.credFSOverride,
    credAlign: S.credAlign, credOffX: S.credOffX, credOffY: S.credOffY, credShadow: S.credShadow, textPos: S.textPos
  };
  saveTemplates(templates);
  refreshTplSelect();
  $tplSelect.value = name;
  $tplName.value = '';
  app.showToast('\u2713 Vorlage "' + name + '" gespeichert');
});
$tplLoad.addEventListener('click', function() {
  var name = $tplSelect.value;
  if (!name) { app.showToast('\u26a0 Bitte Vorlage w\u00e4hlen'); return; }
  var templates = loadTemplates();
  var tpl = templates[name];
  if (!tpl) return;
  pushUndo();
  if (tpl.layout) setLayout(tpl.layout);
  if (tpl.format) setFormat(tpl.format);
  if (typeof tpl.hlCaps === 'boolean') {
    S.hlCaps = tpl.hlCaps;
    $togHlCaps.classList.toggle('on', S.hlCaps);
    $togHlCaps.setAttribute('aria-checked', String(S.hlCaps));
  }
  if (typeof tpl.subCaps === 'boolean') {
    S.subCaps = tpl.subCaps;
    $togSubCaps.classList.toggle('on', S.subCaps);
    $togSubCaps.setAttribute('aria-checked', String(S.subCaps));
  }
  S.hlFSOverride = tpl.hlFSOverride || 0;
  S.subFSOverride = tpl.subFSOverride || 0;
  S.credFSOverride = tpl.credFSOverride || 0;
  updateFSSlider();
  S.credAlign = tpl.credAlign || 'right';
  S.credOffX = tpl.credOffX || 0;
  S.credOffY = tpl.credOffY || 0;
  S.credShadow = !!tpl.credShadow;
  Object.keys(CA_BTNS).forEach(function(k) {
    CA_BTNS[k].classList.toggle('on', k === S.credAlign);
    CA_BTNS[k].setAttribute('aria-checked', String(k === S.credAlign));
  });
  updateCredOffsetUI();
  S.textPos = tpl.textPos || 'top';
  Object.keys(TP_BTNS).forEach(function(k) {
    TP_BTNS[k].classList.toggle('on', k === S.textPos);
    TP_BTNS[k].setAttribute('aria-checked', String(k === S.textPos));
  });
  app.saveState();
  app.scheduleDraw();
  app.showToast('\u2713 Vorlage "' + name + '" geladen');
});
$tplDel.addEventListener('click', function() {
  var name = $tplSelect.value;
  if (!name) { app.showToast('\u26a0 Bitte Vorlage w\u00e4hlen'); return; }
  if (!confirm('Vorlage "' + name + '" l\u00f6schen?')) return;
  var templates = loadTemplates();
  delete templates[name];
  saveTemplates(templates);
  refreshTplSelect();
  app.showToast('\u2713 Vorlage gel\u00f6scht');
});

// Hook undo into input handlers (debounced)
function debouncedUndo() {
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(pushUndo, 600);
}
$hl.addEventListener('input', debouncedUndo);
$sub.addEventListener('input', debouncedUndo);
$date.addEventListener('change', function() { pushUndo(); });

// ===== refreshEditorFromState =====
function refreshEditorFromState() {
  $hl.value = S.hlLines.join('\n');
  $sub.value = S.subText;
  $date.value = deToISO(S.dateText) || todayISO();
  $togHlCaps.classList.toggle('on', S.hlCaps);
  $togHlCaps.setAttribute('aria-checked', String(S.hlCaps));
  $togSubCaps.classList.toggle('on', S.subCaps);
  $togSubCaps.setAttribute('aria-checked', String(S.subCaps));
  setLayout(S.layout);
  setFormat(S.format);
  updateFSSlider();
  Object.keys(CA_BTNS).forEach(function(k) {
    CA_BTNS[k].classList.toggle('on', k === S.credAlign);
    CA_BTNS[k].setAttribute('aria-checked', String(k === S.credAlign));
  });
  updateCredOffsetUI();
  Object.keys(TP_BTNS).forEach(function(k) {
    TP_BTNS[k].classList.toggle('on', k === S.textPos);
    TP_BTNS[k].setAttribute('aria-checked', String(k === S.textPos));
  });
  app.autoSize($hl);
  app.autoSize($sub);
  app.renderUI();
}

// ===== REGISTER ON APP =====
app.setLayout = setLayout;
app.setFormat = setFormat;
app.updateFSSlider = updateFSSlider;
app.updateCredOffsetUI = updateCredOffsetUI;
app.refreshEditorFromState = refreshEditorFromState;
app.stateSnapshot = stateSnapshot;
app.snapshotsEqual = snapshotsEqual;
app.pushUndo = pushUndo;
app.markSaved = function() { lastSnap = stateSnapshot(); _savedSnap = stateSnapshot(); };
app.getSavedSnap = function() { return _savedSnap; };
app.loadTemplates = loadTemplates;
app.refreshTplSelect = refreshTplSelect;
app.loadImageFile = loadImageFile;
app.initLastSnap = function() { lastSnap = stateSnapshot(); _savedSnap = stateSnapshot(); };
