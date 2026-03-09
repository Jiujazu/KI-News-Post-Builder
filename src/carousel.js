import { app, G, S, FORMATS, defaultCrop, todayDE, cv, cx, SYS_FONT, MX,
  $hl, $sub, $date, $hint,
  $deckBar, $deckStrip, $deckLabel, $deckExportPdf, $deckExportImgs, $deckClose,
  $tabSingle, $tabCarousel, $bCarouselExportImgs, $bCarouselExportPdf, $appDiv,
  isoToDE, rebuildGradient } from './state.js';

var MAX_DECK_SLIDES = 50;
var _dragSlideIdx = -1;

function revokeDeckBlobs() {
  for (var i = 0; i < G.deck.length; i++) {
    for (var j = 0; j < 2; j++) {
      if (G.deck[i].blobs[j]) { URL.revokeObjectURL(G.deck[i].blobs[j]); G.deck[i].blobs[j] = null; }
    }
  }
  G.deckThumbCache = [];
}

function setToolMode(mode, force) {
  if (mode === G.currentToolMode && !force) return;
  if (!force && mode === 'single' && G.deckActive && G.deck.length > 0) {
    if (!confirm('Karussell mit ' + G.deck.length + ' Slide' + (G.deck.length > 1 ? 's' : '') + ' verwerfen und zum Einzelpost wechseln?')) return;
  }
  G.currentToolMode = mode;
  $appDiv.classList.toggle('mode-single', mode === 'single');
  $appDiv.classList.toggle('mode-carousel', mode === 'carousel');
  $tabSingle.classList.toggle('active', mode === 'single');
  $tabCarousel.classList.toggle('active', mode === 'carousel');
  $tabSingle.setAttribute('aria-selected', String(mode === 'single'));
  $tabCarousel.setAttribute('aria-selected', String(mode === 'carousel'));
  if (mode === 'carousel') {
    if (!G.deckActive) startDeck();
  } else {
    if (G.deckActive) {
      G._loadedPostId = null;
      revokeDeckBlobs();
      G.deckActive = false;
      G.deck = [];
      G.currentSlideIdx = 0;
      $deckBar.classList.remove('active');
    }
  }
  app.updateSaveButtonLabel();
}

$tabSingle.addEventListener('click', function() { setToolMode('single'); });
$tabCarousel.addEventListener('click', function() { setToolMode('carousel'); });
$bCarouselExportImgs.addEventListener('click', function() { if ($deckExportImgs) $deckExportImgs.click(); });
$bCarouselExportPdf.addEventListener('click', function() { if ($deckExportPdf) $deckExportPdf.click(); });

function slideSnapshot() {
  return {
    imgs: [S.imgs[0], S.imgs[1]],
    blobs: [S.blobs[0], S.blobs[1]],
    draftBlobs: [S.draftBlobs[0], S.draftBlobs[1]],
    creds: [S.creds[0], S.creds[1]],
    crop: [Object.assign({}, S.crop[0]), Object.assign({}, S.crop[1])],
    layout: S.layout,
    format: S.format,
    hlCaps: S.hlCaps,
    subCaps: S.subCaps,
    hlLines: S.hlLines.slice(),
    subText: S.subText,
    dateText: S.dateText,
    hlFSOverride: S.hlFSOverride,
    subFSOverride: S.subFSOverride,
    credFSOverride: S.credFSOverride,
    credAlign: S.credAlign,
    credOffX: S.credOffX,
    credOffY: S.credOffY,
    credShadow: S.credShadow,
    textPos: S.textPos
  };
}

function loadSlideState(snap) {
  S.imgs = [snap.imgs[0], snap.imgs[1]];
  S.blobs = [snap.blobs[0], snap.blobs[1]];
  S.draftBlobs = [snap.draftBlobs[0], snap.draftBlobs[1]];
  S.creds = [snap.creds[0], snap.creds[1]];
  S.crop = [Object.assign({}, snap.crop[0]), Object.assign({}, snap.crop[1])];
  S.layout = snap.layout;
  S.format = snap.format || S.format;
  S.hlCaps = snap.hlCaps;
  S.subCaps = snap.subCaps;
  S.hlLines = snap.hlLines.slice();
  S.subText = snap.subText;
  S.dateText = snap.dateText;
  S.hlFSOverride = snap.hlFSOverride;
  S.subFSOverride = snap.subFSOverride;
  S.credFSOverride = snap.credFSOverride;
  S.credAlign = snap.credAlign;
  S.credOffX = snap.credOffX;
  S.credOffY = snap.credOffY;
  S.credShadow = snap.credShadow;
  S.textPos = snap.textPos;
}

function refreshEditorFromState() {
  app.refreshEditorFromState();
}

function saveCurrentSlide() {
  if (!G.deckActive || !G.deck.length) return;
  S.hlLines = $hl.value.split('\n');
  S.subText = $sub.value;
  var iso = $date.value;
  if (iso) S.dateText = isoToDE(iso);
  G.deck[G.currentSlideIdx] = slideSnapshot();
}

function switchToSlide(idx) {
  if (idx < 0 || idx >= G.deck.length) return;
  saveCurrentSlide();
  if (G.deckThumbCache[G.currentSlideIdx]) G.deckThumbCache[G.currentSlideIdx] = null;
  G.currentSlideIdx = idx;
  loadSlideState(G.deck[idx]);
  refreshEditorFromState();
  app.baseDraw();
  renderDeckStrip();
}

function renderDeckStrip() {
  if (!G.deckActive) return;
  while ($deckStrip.firstChild) $deckStrip.removeChild($deckStrip.firstChild);
  S.hlLines = $hl.value.split('\n');
  S.subText = $sub.value;
  var iso = $date.value;
  if (iso) S.dateText = isoToDE(iso);
  G.deck[G.currentSlideIdx] = slideSnapshot();

  var thumbW = 120;
  var thumbH = Math.round(thumbW * (G.H / G.W)) || 90;
  var containerW = 72;
  var containerH = Math.round(containerW * (G.H / G.W));

  while (G.deckThumbCache.length < G.deck.length) G.deckThumbCache.push(null);
  if (G.deckThumbCache.length > G.deck.length) G.deckThumbCache.length = G.deck.length;

  app.baseDraw();
  var curCache = document.createElement('canvas');
  curCache.width = thumbW; curCache.height = thumbH;
  curCache.getContext('2d').drawImage(cv, 0, 0, thumbW, thumbH);
  G.deckThumbCache[G.currentSlideIdx] = curCache;

  for (var i = 0; i < G.deck.length; i++) {
    var div = document.createElement('div');
    div.className = 'deck-slide' + (i === G.currentSlideIdx ? ' current' : '');
    div.setAttribute('data-idx', i);
    div.style.height = containerH + 'px';

    if (!G.deckThumbCache[i]) {
      loadSlideState(G.deck[i]);
      app.baseDraw();
      var cc = document.createElement('canvas');
      cc.width = thumbW; cc.height = thumbH;
      cc.getContext('2d').drawImage(cv, 0, 0, thumbW, thumbH);
      G.deckThumbCache[i] = cc;
      loadSlideState(G.deck[G.currentSlideIdx]);
      app.baseDraw();
    }
    var tc = document.createElement('canvas');
    tc.width = thumbW; tc.height = thumbH;
    tc.getContext('2d').drawImage(G.deckThumbCache[i], 0, 0);
    tc.className = 'deck-thumb-canvas';
    div.appendChild(tc);

    var num = document.createElement('span');
    num.className = 'slide-num';
    num.textContent = (i + 1);
    div.appendChild(num);

    if (G.deck.length > 1) {
      var rm = document.createElement('button');
      rm.className = 'slide-rm';
      rm.textContent = '\u00d7';
      rm.setAttribute('data-idx', i);
      rm.addEventListener('click', (function(idx) {
        return function(e) {
          e.stopPropagation();
          removeSlide(idx);
        };
      })(i));
      div.appendChild(rm);
    }

    // Drag & drop reordering
    div.draggable = true;
    div.addEventListener('dragstart', (function(idx) {
      return function(e) {
        _dragSlideIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', '' + idx); } catch (ex) {}
        setTimeout(function() { div.style.opacity = '0.4'; }, 0);
      };
    })(i));
    div.addEventListener('dragend', function() {
      this.style.opacity = '';
      _dragSlideIdx = -1;
      var allSlides = $deckStrip.querySelectorAll('.deck-slide');
      for (var j = 0; j < allSlides.length; j++) {
        allSlides[j].classList.remove('drag-over-left', 'drag-over-right');
      }
    });
    div.addEventListener('dragover', (function(idx) {
      return function(e) {
        if (_dragSlideIdx < 0 || _dragSlideIdx === idx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var rect = this.getBoundingClientRect();
        var midX = rect.left + rect.width / 2;
        this.classList.toggle('drag-over-left', e.clientX < midX);
        this.classList.toggle('drag-over-right', e.clientX >= midX);
      };
    })(i));
    div.addEventListener('dragleave', function() {
      this.classList.remove('drag-over-left', 'drag-over-right');
    });
    div.addEventListener('drop', (function(idx) {
      return function(e) {
        e.preventDefault();
        this.classList.remove('drag-over-left', 'drag-over-right');
        if (_dragSlideIdx < 0 || _dragSlideIdx === idx) return;
        var rect = this.getBoundingClientRect();
        var midX = rect.left + rect.width / 2;
        var targetIdx = e.clientX < midX ? idx : idx + 1;
        if (_dragSlideIdx < targetIdx) targetIdx--;
        if (_dragSlideIdx === targetIdx) return;
        moveSlide(_dragSlideIdx, targetIdx);
        _dragSlideIdx = -1;
      };
    })(i));

    div.addEventListener('click', (function(idx) {
      return function() { switchToSlide(idx); };
    })(i));

    $deckStrip.appendChild(div);
  }

  // Add button
  var addBtn = document.createElement('button');
  addBtn.className = 'deck-add';
  addBtn.style.height = containerH + 'px';
  addBtn.textContent = '+';
  addBtn.title = 'Slide hinzuf\u00fcgen';
  if (G.deck.length >= MAX_DECK_SLIDES) {
    addBtn.disabled = true;
    addBtn.title = 'Maximale Slide-Anzahl erreicht (' + MAX_DECK_SLIDES + ')';
  }
  addBtn.addEventListener('click', addSlide);
  $deckStrip.appendChild(addBtn);

  $deckLabel.textContent = 'Slide ' + (G.currentSlideIdx + 1) + ' / ' + G.deck.length;

  var currentEl = $deckStrip.querySelector('.current');
  if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// Touch-based drag & drop for mobile
(function() {
  var touchSlide = null, touchIdx = -1, touchClone = null, touchStartX = 0, touchStartY = 0, touchMoved = false;
  $deckStrip.addEventListener('touchstart', function(e) {
    var sl = e.target.closest('.deck-slide');
    if (!sl || e.target.closest('.slide-rm')) return;
    touchSlide = sl;
    touchIdx = +sl.getAttribute('data-idx');
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
  }, { passive: true });
  $deckStrip.addEventListener('touchmove', function(e) {
    if (touchIdx < 0) return;
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;
    if (!touchMoved && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (!touchMoved && Math.abs(dy) > Math.abs(dx)) { touchIdx = -1; return; }
    touchMoved = true;
    e.preventDefault();
    if (!touchClone) {
      touchClone = touchSlide.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;opacity:0.8;pointer-events:none;width:' + touchSlide.offsetWidth + 'px;height:' + touchSlide.offsetHeight + 'px;';
      document.body.appendChild(touchClone);
      touchSlide.style.opacity = '0.3';
    }
    touchClone.style.left = (e.touches[0].clientX - touchSlide.offsetWidth / 2) + 'px';
    touchClone.style.top = (e.touches[0].clientY - touchSlide.offsetHeight / 2) + 'px';
    var allSlides = $deckStrip.querySelectorAll('.deck-slide');
    for (var j = 0; j < allSlides.length; j++) {
      allSlides[j].classList.remove('drag-over-left', 'drag-over-right');
      var rect = allSlides[j].getBoundingClientRect();
      if (e.touches[0].clientX >= rect.left && e.touches[0].clientX <= rect.right) {
        var midX = rect.left + rect.width / 2;
        allSlides[j].classList.toggle('drag-over-left', e.touches[0].clientX < midX);
        allSlides[j].classList.toggle('drag-over-right', e.touches[0].clientX >= midX);
      }
    }
  }, { passive: false });
  function touchEnd(e) {
    if (touchIdx < 0) { cleanup(); return; }
    if (touchMoved) {
      var cx2 = e.changedTouches[0].clientX;
      var allSlides = $deckStrip.querySelectorAll('.deck-slide');
      for (var j = 0; j < allSlides.length; j++) {
        allSlides[j].classList.remove('drag-over-left', 'drag-over-right');
        var rect = allSlides[j].getBoundingClientRect();
        if (cx2 >= rect.left && cx2 <= rect.right) {
          var targetIdx = +allSlides[j].getAttribute('data-idx');
          var midX = rect.left + rect.width / 2;
          var insertIdx = cx2 < midX ? targetIdx : targetIdx + 1;
          if (touchIdx < insertIdx) insertIdx--;
          if (touchIdx !== insertIdx) moveSlide(touchIdx, insertIdx);
          break;
        }
      }
    }
    cleanup();
  }
  function cleanup() {
    if (touchClone) { touchClone.remove(); touchClone = null; }
    if (touchSlide) touchSlide.style.opacity = '';
    touchSlide = null; touchIdx = -1; touchMoved = false;
  }
  $deckStrip.addEventListener('touchend', touchEnd);
  $deckStrip.addEventListener('touchcancel', function() { cleanup(); });
})();

function addSlide() {
  if (G.deck.length >= MAX_DECK_SLIDES) {
    app.showToast('\u26a0 Maximale Slide-Anzahl erreicht (' + MAX_DECK_SLIDES + ')');
    return;
  }
  saveCurrentSlide();
  var newSlide = {
    imgs: [null, null],
    blobs: [null, null],
    draftBlobs: [null, null],
    creds: ['', ''],
    crop: [defaultCrop(), defaultCrop()],
    layout: 'one',
    format: S.format,
    hlCaps: false,
    subCaps: false,
    hlLines: [''],
    subText: '',
    dateText: S.dateText,
    hlFSOverride: 0,
    subFSOverride: 0,
    credFSOverride: 0,
    credAlign: 'right',
    credOffX: 0,
    credOffY: 0,
    credShadow: false,
    textPos: 'top'
  };
  G.deck.push(newSlide);
  switchToSlide(G.deck.length - 1);
  app.saveDraft();
}

function removeSlide(idx) {
  if (G.deck.length <= 1) return;
  if (!confirm('Slide ' + (idx + 1) + ' unwiderruflich l\u00f6schen?')) return;
  var removed = G.deck[idx];
  if (removed) {
    for (var ri = 0; ri < 2; ri++) {
      if (removed.blobs[ri]) {
        var urlInUse = false;
        for (var oi = 0; oi < G.deck.length; oi++) {
          if (oi !== idx && G.deck[oi].blobs[ri] === removed.blobs[ri]) { urlInUse = true; break; }
        }
        if (!urlInUse) URL.revokeObjectURL(removed.blobs[ri]);
      }
    }
  }
  G.deck.splice(idx, 1);
  G.deckThumbCache.splice(idx, 1);
  if (G.currentSlideIdx >= G.deck.length) G.currentSlideIdx = G.deck.length - 1;
  else if (idx < G.currentSlideIdx) G.currentSlideIdx--;
  loadSlideState(G.deck[G.currentSlideIdx]);
  refreshEditorFromState();
  app.baseDraw();
  renderDeckStrip();
  app.saveDraft();
}

function moveSlide(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= G.deck.length || toIdx >= G.deck.length) return;
  saveCurrentSlide();
  var slide = G.deck.splice(fromIdx, 1)[0];
  var thumb = G.deckThumbCache.splice(fromIdx, 1)[0];
  G.deck.splice(toIdx, 0, slide);
  G.deckThumbCache.splice(toIdx, 0, thumb);
  if (G.currentSlideIdx === fromIdx) {
    G.currentSlideIdx = toIdx;
  } else if (fromIdx < G.currentSlideIdx && toIdx >= G.currentSlideIdx) {
    G.currentSlideIdx--;
  } else if (fromIdx > G.currentSlideIdx && toIdx <= G.currentSlideIdx) {
    G.currentSlideIdx++;
  }
  loadSlideState(G.deck[G.currentSlideIdx]);
  refreshEditorFromState();
  app.baseDraw();
  renderDeckStrip();
}

function startDeck() {
  if (G.deckActive) return;
  G.deckActive = true;
  G._loadedPostId = null;
  G.deck = [slideSnapshot()];
  G.deckThumbCache = [null];
  G.currentSlideIdx = 0;
  $deckBar.classList.add('active');
  app.updateSaveButtonLabel();
  app.baseDraw();
  renderDeckStrip();
  app.showToast('Karussell-Modus aktiv \u2013 Slides hinzuf\u00fcgen mit +');
}

function stopDeck() {
  if (!G.deckActive) return;
  setToolMode('single', true);
  app.showToast('Karussell-Modus beendet');
}

$deckClose.addEventListener('click', function() {
  if (G.deck.length > 0 && !confirm('Karussell beenden?' + (G.deck.length > 1 ? ' Alle Slides au\u00dfer dem aktuellen gehen verloren.' : ''))) return;
  stopDeck();
});

// PDF Export
$deckExportPdf.addEventListener('click', function() {
  if (!G.deckActive || !G.deck.length) return;
  saveCurrentSlide();
  var btn = $deckExportPdf;
  btn.disabled = true;
  btn.textContent = 'Exportiert\u2026';
  G._exportLock = true;

  function doExport() {
    try {
      var origSnap = slideSnapshot();
      loadSlideState(G.deck[0]);
      app.setFormat(G.deck[0].format || S.format);
      var orient = G.W > G.H ? 'landscape' : 'portrait';
      var pdfW = G.W, pdfH = G.H;
      var pdf = new window.jspdf.jsPDF({
        orientation: orient,
        unit: 'px',
        format: [pdfW, pdfH],
        hotfixes: ['px_scaling']
      });

      var failedSlides = [];
      for (var i = 0; i < G.deck.length; i++) {
        if (i > 0) pdf.addPage([pdfW, pdfH], orient);
        loadSlideState(G.deck[i]);
        app.setFormat(G.deck[i].format || S.format);
        app.baseDraw();
        try {
          var imgData = cv.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        } catch (taintErr) {
          failedSlides.push(i + 1);
          pdf.setFillColor(26, 26, 62);
          pdf.rect(0, 0, pdfW, pdfH, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(24);
          pdf.text('Slide ' + (i + 1) + ' \u2013 Export nicht m\u00f6glich (CORS)', pdfW / 2, pdfH / 2, { align: 'center' });
        }
      }

      loadSlideState(origSnap);
      app.setFormat(origSnap.format || S.format);
      app.baseDraw();

      if (failedSlides.length > 0) {
        app.showToast('\u26a0 Slides ' + failedSlides.join(', ') + ' konnten nicht exportiert werden (CORS)');
      }

      pdf.save('ki-news-karussell-' + new Date().toISOString().slice(0, 10) + '.pdf');
      btn.classList.add('btn-success');
      app.showToast('\u2713 PDF mit ' + G.deck.length + ' Slides exportiert');
      setTimeout(function() { btn.classList.remove('btn-success'); }, 1500);
    } catch (err) {
      console.error('PDF export failed:', err);
      app.showToast('\u26a0 PDF-Export fehlgeschlagen: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = 'PDF Export';
    G._exportLock = false;
  }

  if (window.jspdf) {
    doExport();
  } else {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.onload = doExport;
    script.onerror = function() {
      btn.disabled = false;
      btn.textContent = 'PDF Export';
      app.showToast('\u26a0 jsPDF konnte nicht geladen werden');
    };
    document.head.appendChild(script);
  }
});

// Batch image export
$deckExportImgs.addEventListener('click', function() {
  if (!G.deckActive || !G.deck.length) return;
  saveCurrentSlide();
  var btn = $deckExportImgs;
  btn.disabled = true;
  btn.textContent = 'Exportiert\u2026';
  var isJpg = G.saveFmt === 'jpg';
  var mime = isJpg ? 'image/jpeg' : 'image/png';
  var ext = isJpg ? '.jpg' : '.png';
  G._exportLock = true;
  var origSnap = slideSnapshot();
  var ts = new Date().toISOString().slice(0, 10);

  function exportSlide(i) {
    if (i >= G.deck.length) {
      loadSlideState(origSnap);
      app.setFormat(origSnap.format || S.format);
      app.baseDraw();
      G._exportLock = false;
      btn.disabled = false;
      btn.textContent = 'Bilder Export';
      btn.classList.add('btn-success');
      app.showToast('\u2713 ' + G.deck.length + ' Slides als ' + (isJpg ? 'JPG' : 'PNG') + ' exportiert');
      setTimeout(function() { btn.classList.remove('btn-success'); }, 1500);
      return;
    }
    loadSlideState(G.deck[i]);
    app.setFormat(G.deck[i].format || S.format);
    app.baseDraw();
    try {
      var args = [function(blob) {
        if (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.download = 'ki-news-karussell-' + ts + '-slide-' + (i + 1) + ext;
          a.href = url;
          a.click();
          setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }
        setTimeout(function() { exportSlide(i + 1); }, 300);
      }, mime];
      if (isJpg) args.push(0.95);
      cv.toBlob.apply(cv, args);
    } catch (taintErr) {
      console.warn('Slide ' + (i + 1) + ' export failed (tainted canvas):', taintErr);
      app.showToast('\u26a0 Slide ' + (i + 1) + ' konnte nicht exportiert werden');
      setTimeout(function() { exportSlide(i + 1); }, 100);
    }
  }
  exportSlide(0);
});

// Debounced deck thumb update (called from draw via app.onDraw)
var deckThumbTimer = null;
function scheduleDeckThumbUpdate() {
  if (!G.deckActive) return;
  clearTimeout(deckThumbTimer);
  deckThumbTimer = setTimeout(function() {
    if (!G.deckActive) return;
    var thumbCanvas = $deckStrip.querySelector('.deck-slide.current .deck-thumb-canvas');
    if (thumbCanvas) {
      thumbCanvas.getContext('2d').drawImage(cv, 0, 0, thumbCanvas.width, thumbCanvas.height);
      if (G.deckThumbCache[G.currentSlideIdx]) {
        G.deckThumbCache[G.currentSlideIdx].getContext('2d').drawImage(cv, 0, 0, G.deckThumbCache[G.currentSlideIdx].width, G.deckThumbCache[G.currentSlideIdx].height);
      }
    }
  }, 250);
}

// ===== REGISTER ON APP =====
app.setToolMode = setToolMode;
app.slideSnapshot = slideSnapshot;
app.loadSlideState = loadSlideState;
app.saveCurrentSlide = saveCurrentSlide;
app.switchToSlide = switchToSlide;
app.renderDeckStrip = renderDeckStrip;
app.revokeDeckBlobs = revokeDeckBlobs;
app.onDraw = scheduleDeckThumbUpdate;
