import './style.css';

(function(){
"use strict";
// ===== CONSTANTS =====
const SYS_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const MX = 52;                // horizontal margin
const TOP_PAD = 55;           // space above headline
const FOOTER_H = 100;         // footer height
const IMG_GAP = 16;           // gap between two images
const IMG_TOP_GAP = 24;       // gap between text and images
const IMG_MIN_H = 80;         // minimum image height
const HL_MIN_FS = 120;        // minimum headline font size after shrink
const HL_MAX_LINES = 3;       // max wrapped headline lines
const SUB_MAX_LINES = 2;      // max wrapped subtitle lines
const HL_LINE_H_FACTOR = 1.08;  // headline line-height multiplier
const SUB_LINE_H_FACTOR = 1.15; // subtitle line-height multiplier
const FOOTER_FS = 36;         // footer font size
const FOOTER_BOTTOM = 32;     // footer distance from bottom
const LOGO_H = 56;            // logo height in footer
const FORMATS = {
  '4:5':  { w: 1200, h: 1500 },
  '1:1':  { w: 1200, h: 1200 },
  '16:9': { w: 1200, h: 675 },
  '9:16': { w: 1080, h: 1920 }
};
let W = 1200, H = 1500;
const SAFE_ZONE_RATIO = 0.08; // LinkedIn overlay covers ~8% of slide height
let showSafeZone = false;
const LOGO = new Image();
LOGO.onload = function() { scheduleDraw(); };
LOGO.onerror = function() { console.warn('Logo konnte nicht geladen werden'); };
LOGO.src = "/logo.png";
// ===== GRADIENT =====
const GRADIENT_STOPS = [
  [0,    '#025671'],
  [0.50, '#261c53'],
  [1,    '#1f0e1d']
];
// ===== CACHED GRADIENT =====
const gradCV = document.createElement('canvas');
function rebuildGradient() {
  gradCV.width = 1; gradCV.height = H;
  var gx = gradCV.getContext('2d');
  var grad = gx.createLinearGradient(0, 0, 0, H);
  for (var gi = 0; gi < GRADIENT_STOPS.length; gi++) {
    grad.addColorStop(GRADIENT_STOPS[gi][0], GRADIENT_STOPS[gi][1]);
  }
  gx.fillStyle = grad;
  gx.fillRect(0, 0, 1, H);
}
rebuildGradient();
// ===== CANVAS =====
const cv = document.getElementById('cv');
const cx = cv.getContext('2d');
// ===== CONSTANTS =====
const MONTHS_DE = ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function isoToDE(iso) {
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var day = parseInt(p[2],10), m = parseInt(p[1],10)-1;
  if (m < 0 || m > 11) return iso;
  return day + '. ' + MONTHS_DE[m] + ' ' + parseInt(p[0],10);
}
function deToISO(de) {
  var match = de.match(/^(\d{1,2})\.\s*(\S+)\s+(\d{4})$/);
  if (!match) return '';
  var m = MONTHS_DE.indexOf(match[2]);
  if (m === -1) return '';
  return match[3] + '-' + String(m+1).padStart(2,'0') + '-' + String(parseInt(match[1],10)).padStart(2,'0');
}
function todayDE() {
  return isoToDE(todayISO());
}
// ===== STATE =====
function defaultCrop() { return {x:50, y:50, z:100, flip:false, cropH:100}; }
const S = {
  imgs: [null, null],
  blobs: [null, null],
  draftBlobs: [null, null],
  creds: ['', ''],
  crop: [defaultCrop(), defaultCrop()],
  layout: 'one',
  format: '4:5',
  editing: true,
  hlCaps: false,
  subCaps: false,
  hlLines: [''],
  subText: '',
  dateText: todayDE(),
  hlFSOverride: 0,
  subFSOverride: 0,
  credFSOverride: 0,
  credAlign: 'right',
  credOffX: 0,
  credOffY: 0,
  credShadow: false,
  textPos: 'top'
};
// ===== DOM REFS =====
const $hl   = document.getElementById('inHL');
const $sub  = document.getElementById('inSub');
const $date = document.getElementById('inDate');
const $EP   = document.getElementById('EP');
const $segCtrl = document.getElementById('segCtrl');
const $segEdit = document.getElementById('segEdit');
const $segPreview = document.getElementById('segPreview');
const $bSave = document.getElementById('bSave');
const $bSaveArrow = document.getElementById('bSaveArrow');
const $saveMenu = document.getElementById('saveMenu');
let saveFmt = localStorage.getItem('ki-save-fmt') || 'png';
const $bC   = document.getElementById('bC');
const $bS   = document.getElementById('bS');
const $togHlCaps = document.getElementById('togHlCaps');
const $togSubCaps = document.getElementById('togSubCaps');
const $swapBtn = document.getElementById('swapBtn');
const $toast   = document.getElementById('toast');
const $lbTwo     = document.getElementById('lbTwo');
const $lbStacked = document.getElementById('lbStacked');
const $lbOne     = document.getElementById('lbOne');
const $lbNone    = document.getElementById('lbNone');
const $imgEd   = document.getElementById('imgEd');
const $hlCount  = document.getElementById('hlCount');
const $subCount = document.getElementById('subCount');
const $hint    = document.getElementById('hint');
const $fmtBtns = document.querySelectorAll('.fmt');
const $btnSafeZone = document.getElementById('btnSafeZone');
const $z  = [document.getElementById('z0'),  document.getElementById('z1')];
const $pv = [document.getElementById('pv0'), document.getElementById('pv1')];
const $ph = [document.getElementById('ph0'), document.getElementById('ph1')];
const $f  = [document.getElementById('f0'),  document.getElementById('f1')];
const $rm = [document.getElementById('rm0'), document.getElementById('rm1')];
const $cr = [document.getElementById('cr0'), document.getElementById('cr1')];
const $sz = [document.getElementById('sz0'), document.getElementById('sz1')];
const $sx = [document.getElementById('sx0'), document.getElementById('sx1')];
const $sy = [document.getElementById('sy0'), document.getElementById('sy1')];
const $vz = [document.getElementById('vz0'), document.getElementById('vz1')];
const $vx = [document.getElementById('vx0'), document.getElementById('vx1')];
const $vy = [document.getElementById('vy0'), document.getElementById('vy1')];
const $cc = [document.getElementById('cc0'), document.getElementById('cc1')];
const $fsSlider = document.getElementById('fsSlider');
const $fsVal = document.getElementById('fsVal');
const $fsReset = document.getElementById('fsReset');
const $subFsSlider = document.getElementById('subFsSlider');
const $subFsVal = document.getElementById('subFsVal');
const $subFsReset = document.getElementById('subFsReset');
const $credFsSlider = document.getElementById('credFsSlider');
const $credFsVal = document.getElementById('credFsVal');
const $credFsReset = document.getElementById('credFsReset');
const $cr0Wrap = document.getElementById('cr0Wrap');
const $cr1Wrap = document.getElementById('cr1Wrap');
const $cropHint = document.getElementById('cropHint');
const $tpTop = document.getElementById('tpTop');
const $tpCenter = document.getElementById('tpCenter');
const $tpBottom = document.getElementById('tpBottom');
const $caLeft = document.getElementById('caLeft');
const $caRight = document.getElementById('caRight');
const $caCenter = document.getElementById('caCenter');
const $credOffXSlider = document.getElementById('credOffXSlider');
const $credOffXVal = document.getElementById('credOffXVal');
const $credOffXReset = document.getElementById('credOffXReset');
const $credOffYSlider = document.getElementById('credOffYSlider');
const $credOffYVal = document.getElementById('credOffYVal');
const $credOffYReset = document.getElementById('credOffYReset');
const $credShadowToggle = document.getElementById('credShadowToggle');
const $dropOverlay = document.getElementById('dropOverlay');
const $themeToggle = document.getElementById('themeToggle');
const $tplSelect = document.getElementById('tplSelect');
const $tplLoad = document.getElementById('tplLoad');
const $tplDel = document.getElementById('tplDel');
const $tplName = document.getElementById('tplName');
const $tplSave = document.getElementById('tplSave');
const $bA   = document.getElementById('bA');
const $bASaveLabel = $bA.querySelector('.save-label');
function setSaveLabel(text) {
  if ($bASaveLabel) $bASaveLabel.textContent = text;
  else $bA.textContent = text;
}
const $bSaveCopy = document.getElementById('bSaveCopy');
function updateSaveButtonLabel() {
  var isCarousel = typeof deckActive !== 'undefined' && deckActive;
  if (_loadedPostId) {
    setSaveLabel('\u00dcberschreiben');
    $bA.setAttribute('aria-label', 'Ge\u00e4nderten Post \u00fcberschreiben');
    $bSaveCopy.style.display = '';
  } else {
    setSaveLabel(isCarousel ? 'Karussell speichern' : 'Speichern');
    $bA.setAttribute('aria-label', 'Post speichern');
    $bSaveCopy.style.display = 'none';
  }
}
$bSaveCopy.addEventListener('click', function() {
  _loadedPostId = null;
  $bA.click(); // trigger normal save (now without _loadedPostId → creates new post)
});
const $bH   = document.getElementById('bH');
const $histOverlay = document.getElementById('histOverlay');
const $histDrawer  = document.getElementById('histDrawer');
const $histClose   = document.getElementById('histClose');
const $histBody    = document.getElementById('histBody');
const $histEmpty   = document.getElementById('histEmpty');
const $histGrid    = document.getElementById('histGrid');
// ===== COLLAPSIBLE SECTIONS =====
(function initCollapsible() {
  var STORE_KEY = 'ki-collapsed';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) {}
  document.querySelectorAll('.ed.collapsible').forEach(function(ed) {
    var id = ed.id;
    var toggle = ed.querySelector('.ed-toggle');
    if (!toggle) return;
    // restore saved state
    if (saved[id]) {
      ed.classList.add('collapsed');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function() {
      ed.classList.toggle('collapsed');
      var open = !ed.classList.contains('collapsed');
      toggle.setAttribute('aria-expanded', String(open));
      saved[id] = !open;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch(e) {}
    });
    toggle.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    });
  });
  // "Collapse/Expand all" button
  var colBtn = document.getElementById('collapseAllBtn');
  if (colBtn) {
    function updateColBtn() {
      var all = document.querySelectorAll('.ed.collapsible');
      var collapsedCount = document.querySelectorAll('.ed.collapsible.collapsed').length;
      var allCollapsed = collapsedCount === all.length;
      colBtn.textContent = allCollapsed ? '\u25b6 Alle ausklappen' : '\u25bc Alle einklappen';
    }
    updateColBtn();
    colBtn.addEventListener('click', function() {
      var all = document.querySelectorAll('.ed.collapsible');
      var collapsedCount = document.querySelectorAll('.ed.collapsible.collapsed').length;
      var shouldCollapse = collapsedCount < all.length;
      all.forEach(function(ed) {
        var toggle = ed.querySelector('.ed-toggle');
        if (shouldCollapse) {
          ed.classList.add('collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          saved[ed.id] = true;
        } else {
          ed.classList.remove('collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
          saved[ed.id] = false;
        }
      });
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch(e) {}
      updateColBtn();
    });
    // Update button text when individual sections are toggled
    document.querySelectorAll('.ed-toggle').forEach(function(t) {
      t.addEventListener('click', function() { setTimeout(updateColBtn, 0); });
    });
  }
})();
// ===== INDEXEDDB =====
const DB_NAME = 'ki-news-history';
const DB_VER = 1;
const DB_STORE = 'posts';
const DRAFT_ID = '__draft__';
let _dbPromise = null;
function dbOpen() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        var store = db.createObjectStore(DB_STORE, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { _dbPromise = null; reject(e.target.error); };
  });
  return _dbPromise;
}
const MAX_ARCHIVE_POSTS = 50;
function dbAdd(post) {
  return dbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(post);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  }).then(function() {
    if (post.id === DRAFT_ID) return;
    return dbGetAll().then(function(posts) {
      if (posts.length <= MAX_ARCHIVE_POSTS) return;
      var toDelete = posts.slice(MAX_ARCHIVE_POSTS);
      showToast('\u26a0 Speicher voll \u2013 ' + toDelete.length + ' \u00e4lteste(r) Post(s) entfernt');
      return Promise.all(toDelete.map(function(p) {
        deleteFromCloud(p.id, p.isCarousel && p.slides ? p.slides.length : 1);
        return dbDelete(p.id);
      }));
    });
  });
}
function dbGetAll() {
  return dbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readonly');
      var req = tx.objectStore(DB_STORE).index('savedAt').getAll();
      req.onsuccess = function() {
        var posts = req.result.filter(function(p) { return p.id !== DRAFT_ID; });
        resolve(posts.reverse());
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}
function dbDelete(id) {
  return dbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}
// ===== DRAFT PERSISTENCE =====
let draftTimer = null;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(function() {
    var draft = {
      id: DRAFT_ID,
      savedAt: new Date().toISOString(),
      headline: S.hlLines.join('\n'),
      subtitle: S.subText,
      date: S.dateText,
      layout: S.layout,
      format: S.format,
      hlCaps: S.hlCaps,
      subCaps: S.subCaps,
      hlFSOverride: S.hlFSOverride,
      subFSOverride: S.subFSOverride,
      credFSOverride: S.credFSOverride,
      credAlign: S.credAlign,
      credOffX: S.credOffX,
      credOffY: S.credOffY,
      credShadow: S.credShadow,
      textPos: S.textPos,
      credits: S.creds.slice(),
      crops: S.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; }),
      images: [S.draftBlobs[0], S.draftBlobs[1]]
    };
    // Save carousel state if active
    if (deckActive && deck.length > 0) {
      // Sync current editor state into the deck before saving
      saveCurrentSlide();
      draft.isCarousel = true;
      draft.currentSlideIdx = currentSlideIdx;
      draft.slides = deck.map(function(snap) {
        return {
          headline: snap.hlLines.join('\n'),
          subtitle: snap.subText,
          date: snap.dateText,
          layout: snap.layout,
          format: snap.format || S.format,
          hlCaps: snap.hlCaps,
          subCaps: snap.subCaps,
          hlFSOverride: snap.hlFSOverride,
          subFSOverride: snap.subFSOverride,
          credFSOverride: snap.credFSOverride,
          credAlign: snap.credAlign,
          credOffX: snap.credOffX,
          credOffY: snap.credOffY,
          credShadow: snap.credShadow,
          textPos: snap.textPos,
          credits: snap.creds.slice(),
          crops: snap.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; }),
          images: [snap.draftBlobs[0], snap.draftBlobs[1]]
        };
      });
    }
    dbAdd(draft).catch(function(e) { console.warn('saveDraft failed:', e); });
  }, 1500);
}
function loadDraft() {
  return dbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readonly');
      var req = tx.objectStore(DB_STORE).get(DRAFT_ID);
      req.onsuccess = function() {
        var draft = req.result || null;
        if (draft && draft.isCarousel && draft.slides) {
          // Restore as carousel post
          loadCarouselPost(draft);
        } else if (draft) {
          // Restore as single post
          loadArchivedPost(draft);
        }
        resolve(draft);
      };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}
function deleteDraft() {
  return dbDelete(DRAFT_ID).catch(function() {});
}
// ===== IMAGE COMPRESSION =====
function compressImage(img, maxSide, quality) {
  maxSide = maxSide || 2000;
  quality = quality || 0.8;
  return new Promise(function(resolve, reject) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxSide || h > maxSide) {
      var ratio = maxSide / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    c.toBlob(function(blob) {
      if (blob) resolve(blob);
      else reject(new Error('compressImage: toBlob returned null'));
    }, 'image/jpeg', quality);
  });
}
function generatePostId() {
  return Date.now().toString(36) + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
}
function canvasToThumbnail(canvas, maxW) {
  maxW = maxW || 300;
  return new Promise(function(resolve) {
    var ratio = maxW / canvas.width;
    var c = document.createElement('canvas');
    c.width = maxW;
    c.height = Math.round(canvas.height * ratio);
    try {
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    } catch (e) {
      // Canvas tainted (CORS) — draw a gradient fallback
      var fbCtx = c.getContext('2d');
      var fbGrad = fbCtx.createLinearGradient(0, 0, 0, c.height);
      fbGrad.addColorStop(0, '#1a1a3e');
      fbGrad.addColorStop(1, '#0a0a1a');
      fbCtx.fillStyle = fbGrad;
      fbCtx.fillRect(0, 0, c.width, c.height);
    }
    c.toBlob(function(blob) {
      if (blob) resolve(blob);
      else {
        // toBlob returned null — use dataURL fallback
        try {
          var dataUrl = c.toDataURL('image/jpeg', 0.85);
          var parts = dataUrl.split(',');
          var byteString = atob(parts[1]);
          var mimeType = parts[0].match(/:(.*?);/)[1];
          var ab = new ArrayBuffer(byteString.length);
          var ia = new Uint8Array(ab);
          for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          resolve(new Blob([ab], { type: mimeType }));
        } catch (e2) {
          // Last resort — resolve with null rather than rejecting to not break save
          resolve(null);
        }
      }
    }, 'image/jpeg', 0.85);
  });
}
// ===== SHOW COPY/SHARE IF SUPPORTED =====
if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
  $bC.style.display = '';
}
if (navigator.canShare && navigator.canShare({ files: [new File([''], 't.jpg', { type: 'image/jpeg' })] })) {
  $bS.style.display = '';
}
// ===== MOBILE OVERFLOW MENU =====
const $toolbarMoreBtn = document.getElementById('toolbarMoreBtn');
let _overflowPanel = null;
function toggleToolbarOverflow() {
  if (_overflowPanel && _overflowPanel.classList.contains('open')) {
    closeToolbarOverflow();
    return;
  }
  if (!_overflowPanel) {
    _overflowPanel = document.createElement('div');
    _overflowPanel.className = 'toolbar-overflow-panel';
    document.querySelector('.btn-row').appendChild(_overflowPanel);
  }
  // Move hidden groups into overflow panel
  var btnRow = document.querySelector('.btn-row');
  var groups = btnRow.querySelectorAll(':scope > .toolbar-share, :scope > .toolbar-save, :scope > .toolbar-util');
  _overflowPanel._sourceGroups = [];
  groups.forEach(function(g) {
    _overflowPanel._sourceGroups.push({el: g, next: g.nextSibling, parent: g.parentNode});
    _overflowPanel.appendChild(g);
  });
  _overflowPanel.classList.add('open');
  $toolbarMoreBtn.setAttribute('aria-expanded', 'true');
  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', _overflowOutsideClick);
  }, 0);
}
function closeToolbarOverflow() {
  if (!_overflowPanel) return;
  // Move groups back to their original positions
  if (_overflowPanel._sourceGroups) {
    _overflowPanel._sourceGroups.forEach(function(info) {
      if (info.next) info.parent.insertBefore(info.el, info.next);
      else info.parent.appendChild(info.el);
    });
    _overflowPanel._sourceGroups = null;
  }
  _overflowPanel.classList.remove('open');
  $toolbarMoreBtn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', _overflowOutsideClick);
}
function _overflowOutsideClick(e) {
  if (_overflowPanel && !_overflowPanel.contains(e.target) && e.target !== $toolbarMoreBtn) {
    closeToolbarOverflow();
  }
}
$toolbarMoreBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  toggleToolbarOverflow();
});
// Close overflow when a button inside it is clicked
document.addEventListener('click', function(e) {
  if (_overflowPanel && _overflowPanel.classList.contains('open') && e.target.closest('.toolbar-overflow-panel button:not(.theme-switcher-btn)')) {
    setTimeout(closeToolbarOverflow, 100);
  }
});
// ===== CHARACTER LIMITS =====
const CHAR_LIMITS = { hl: [60, 70], sub: [70, 80] };
// ===== LOCALSTORAGE =====
const LAYOUT_KEYS = { one: true, two: true, stacked: true, none: true };
const STORE_KEY = 'ki-news-state';
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      hlLines: S.hlLines, subText: S.subText, dateText: S.dateText,
      layout: S.layout, format: S.format, hlCaps: S.hlCaps, subCaps: S.subCaps,
      hlFSOverride: S.hlFSOverride, subFSOverride: S.subFSOverride, credFSOverride: S.credFSOverride,
      credAlign: S.credAlign, credOffX: S.credOffX, credOffY: S.credOffY, credShadow: S.credShadow, textPos: S.textPos
    }));
  } catch(e) { console.warn('saveState failed:', e); }
}
let saveTimer = null;
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}
function loadState() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    var saved = JSON.parse(raw);
    if (Array.isArray(saved.hlLines)) S.hlLines = saved.hlLines;
    if (typeof saved.subText === 'string') S.subText = saved.subText;
    if (typeof saved.dateText === 'string') S.dateText = saved.dateText;
    if (typeof saved.layout === 'string' && LAYOUT_KEYS[saved.layout]) S.layout = saved.layout;
    if (typeof saved.format === 'string' && FORMATS[saved.format]) S.format = saved.format;
    if (typeof saved.hlCaps === 'boolean') S.hlCaps = saved.hlCaps;
    else if (typeof saved.allCaps === 'boolean') S.hlCaps = saved.allCaps;
    if (typeof saved.subCaps === 'boolean') S.subCaps = saved.subCaps;
    if (typeof saved.hlFSOverride === 'number') S.hlFSOverride = saved.hlFSOverride;
    if (typeof saved.subFSOverride === 'number') S.subFSOverride = saved.subFSOverride;
    if (typeof saved.credFSOverride === 'number') S.credFSOverride = saved.credFSOverride;
    if (typeof saved.textPos === 'string') S.textPos = saved.textPos;
    if (typeof saved.credAlign === 'string') S.credAlign = saved.credAlign;
    if (typeof saved.credOffX === 'number') S.credOffX = saved.credOffX;
    if (typeof saved.credOffY === 'number') S.credOffY = saved.credOffY;
    if (typeof saved.credShadow === 'boolean') S.credShadow = saved.credShadow;
    // Credits werden nicht im localStorage gespeichert (nur in IndexedDB mit den Bildern)
  } catch(e) { console.warn('loadState failed:', e); }
}
// Don't auto-restore – always start with a fresh post.
// Users can load saved posts from the "Gespeicherte" drawer.
// ===== RAF THROTTLE =====
let rafPending = false;
let _exportLock = false;
function scheduleDraw() {
  if (rafPending || _exportLock) return;
  rafPending = true;
  requestAnimationFrame(function() {
    rafPending = false;
    if (!_exportLock) draw();
  });
}
// ===== TOAST =====
let toastTimer = null;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { $toast.classList.remove('show'); }, 2000);
}
// ===== LOADING OVERLAY =====
const $loadingOverlay = document.getElementById('loadingOverlay');
let _loadingCount = 0;
function showLoading() {
  _loadingCount++;
  $loadingOverlay.classList.add('show');
  $loadingOverlay.setAttribute('aria-hidden', 'false');
}
function hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1);
  if (_loadingCount === 0) {
    $loadingOverlay.classList.remove('show');
    $loadingOverlay.setAttribute('aria-hidden', 'true');
  }
}
// ===== HELPERS =====
function autoSize(el) {
  if (el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function updateCharCount(el, $counter, soft, hard) {
  el.maxLength = hard;
  var len = el.value.length;
  if (len > soft) {
    $counter.textContent = len + '/' + hard + ' (Empf. ' + soft + ')';
  } else {
    $counter.textContent = len + '/' + soft;
  }
  $counter.classList.toggle('warn', len > soft);
  el.classList.toggle('over', len > soft);
}
function refreshCounts() {
  updateCharCount($hl, $hlCount, CHAR_LIMITS.hl[0], CHAR_LIMITS.hl[1]);
  updateCharCount($sub, $subCount, CHAR_LIMITS.sub[0], CHAR_LIMITS.sub[1]);
}
function revokeBlob(i) {
  if (S.blobs[i]) { URL.revokeObjectURL(S.blobs[i]); S.blobs[i] = null; }
  S.draftBlobs[i] = null;
}
// ===== WORD WRAP =====
let _mtCache = {};
let _mtCacheFont = '';
function cachedMeasure(text) {
  var font = cx.font;
  if (font !== _mtCacheFont) { _mtCache = {}; _mtCacheFont = font; }
  if (text in _mtCache) return _mtCache[text];
  var w = cx.measureText(text).width;
  _mtCache[text] = w;
  return w;
}
function wrapLine(text, fs, maxWidth) {
  cx.font = 'bold ' + fs + 'px Festivo, serif';
  if (cachedMeasure(text) <= maxWidth) return [text];
  var words = text.split(' ');
  var lines = [], cur = '';
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    // Break single words that exceed maxWidth
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
  // Credit field visibility
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
// ===== EVENTS =====
// New post
const $bN = document.getElementById('bN');
$bN.addEventListener('click', function() {
  var hasContent = false;
  if (deckActive && deck.length > 0) {
    saveCurrentSlide();
    for (var ci = 0; ci < deck.length; ci++) {
      var ds = deck[ci];
      if (ds.imgs[0] || ds.imgs[1] || ds.hlLines.join('').trim() || ds.subText.trim()) {
        hasContent = true; break;
      }
    }
  } else {
    hasContent = S.imgs[0] || S.imgs[1] || S.hlLines.join('').trim() || S.subText.trim();
  }
  var msg = deckActive
    ? 'Karussell mit ' + deck.length + ' Slides verwerfen und neu beginnen?'
    : 'Aktuellen Post verwerfen und neu beginnen?';
  if (hasContent && !confirm(msg)) return;
  // Force-reset to single-post mode (confirmation already happened above)
  setToolMode('single', true);
  revokeBlob(0); revokeBlob(1);
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
  autoSize($hl);
  renderUI();
  saveState();
  deleteDraft();
  $bN.textContent = '\u2713 Zur\u00fcckgesetzt';
  $bN.classList.add('btn-success-outline');
  showToast('\u2713 Neuer Post \u2013 alles zur\u00fcckgesetzt');
  setTimeout(function() {
    $bN.textContent = 'Neu';
    $bN.classList.remove('btn-success-outline');
  }, 1500);
});
// ===== SPLIT SAVE BUTTON =====
function updateSaveBtn() {
  var label = saveFmt === 'jpg' ? 'JPG speichern' : 'PNG speichern';
  $bSave.textContent = label;
  $bSave.setAttribute('aria-label', 'Als ' + saveFmt.toUpperCase() + ' speichern');
  var opts = $saveMenu.querySelectorAll('.split-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].getAttribute('data-fmt') === saveFmt);
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
  saveFmt = opt.getAttribute('data-fmt');
  try { localStorage.setItem('ki-save-fmt', saveFmt); } catch(e) {}
  updateSaveBtn();
  $saveMenu.classList.remove('open');
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#saveGroup')) {
    $saveMenu.classList.remove('open');
    $bSaveArrow.setAttribute('aria-expanded', 'false');
  }
});
$bSave.addEventListener('click', function() {
  if (!S.imgs[0] && !S.imgs[1]) { showToast('\u26a0 Bitte mindestens ein Bild hinzuf\u00fcgen'); return; }
  if (!fontReady && !confirm('Font nicht geladen \u2013 Export k\u00f6nnte fehlerhaft aussehen. Trotzdem exportieren?')) return;
  var btn = this;
  var isJpg = saveFmt === 'jpg';
  var mime = isJpg ? 'image/jpeg' : 'image/png';
  var ext = isJpg ? '.jpg' : '.png';
  var fmtLabel = isJpg ? 'JPG' : 'PNG';
  var defaultLabel = fmtLabel + ' speichern';
  btn.disabled = true; setSaveLabel('Speichert\u2026');
  draw();
  var args = [function(blob) {
    if (!blob) {
      btn.disabled = false; btn.textContent = defaultLabel;
      showToast('\u26a0 Export fehlgeschlagen');
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
    showToast('\u2713 ' + fmtLabel + ' in Downloads gespeichert');
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
  draw();
  cv.toBlob(function(blob) {
    if (!blob) {
        btn.disabled = false; btn.textContent = 'Teilen';
        showToast('\u26a0 Teilen fehlgeschlagen');
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
  draw();
  cv.toBlob(function(blob) {
      if (!blob) {
        btn.disabled = false; btn.textContent = 'Kopieren';
        showToast('\u26a0 Kopieren fehlgeschlagen');
        return;
      }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function() {
        btn.textContent = '\u2713 Kopiert!';
        btn.classList.add('btn-success');
        showToast('\u2713 Bild in Zwischenablage kopiert');
        setTimeout(function() {
          btn.disabled = false;
          btn.textContent = 'Kopieren';
          btn.classList.remove('btn-success');
        }, 1500);
      }).catch(function() {
        btn.disabled = false; btn.textContent = 'Kopieren';
        showToast('\u26a0 Kopieren fehlgeschlagen');
      });
    }, 'image/png');
});
// ALL CAPS toggle
$togHlCaps.addEventListener('click', function() {
  S.hlCaps = !S.hlCaps;
  this.classList.toggle('on', S.hlCaps);
  this.setAttribute('aria-checked', String(S.hlCaps));
  pushUndo();
  saveState();
  scheduleDraw();
});
$togSubCaps.addEventListener('click', function() {
  S.subCaps = !S.subCaps;
  this.classList.toggle('on', S.subCaps);
  this.setAttribute('aria-checked', String(S.subCaps));
  pushUndo();
  saveState();
  scheduleDraw();
});
// Headline input
$hl.addEventListener('input', function() {
  var parts = this.value.split('\n');
  if (parts.length > HL_MAX_LINES) { parts = parts.slice(0, HL_MAX_LINES); this.value = parts.join('\n'); }
  S.hlLines = this.value.split('\n').filter(function(l) { return l.length > 0; });
  if (S.hlLines.length === 0) S.hlLines = [''];
  updateCharCount(this, $hlCount, CHAR_LIMITS.hl[0], CHAR_LIMITS.hl[1]);
  autoSize(this);
  debouncedSave();
  scheduleDraw();
});
// Subtitle input
$sub.addEventListener('input', function() {
  var parts = this.value.split('\n');
  if (parts.length > SUB_MAX_LINES) { parts = parts.slice(0, SUB_MAX_LINES); this.value = parts.join('\n'); }
  S.subText = this.value;
  updateCharCount(this, $subCount, CHAR_LIMITS.sub[0], CHAR_LIMITS.sub[1]);
  autoSize(this);
  debouncedSave();
  scheduleDraw();
});
// Date input
$date.addEventListener('change', function() {
  S.dateText = this.value ? isoToDE(this.value) : '';
  debouncedSave();
  scheduleDraw();
});
// Layout buttons
const LAYOUT_BTNS = { two: $lbTwo, stacked: $lbStacked, one: $lbOne, none: $lbNone };
function setLayout(l) {
  S.layout = l;
  Object.keys(LAYOUT_BTNS).forEach(function(k) {
    LAYOUT_BTNS[k].classList.toggle('on', k === l);
    LAYOUT_BTNS[k].setAttribute('aria-checked', String(k === l));
  });
  var hasTwoImgs = (l === 'two' || l === 'stacked');
  $imgEd.style.display = (l === 'none') ? 'none' : 'block';
  $z[1].style.display = hasTwoImgs ? 'flex' : 'none';
  // Swap image zones direction for stacked preview
  var zones = document.querySelector('.img-zones');
  if (zones) zones.style.flexDirection = (l === 'stacked') ? 'column' : '';
  $swapBtn.classList.toggle('vertical', l === 'stacked');
  updateCropVis();
  updateSwapBtn();
  refreshCounts();
  saveState();
  scheduleDraw();
}
$lbTwo.addEventListener('click',     function() { setLayout('two'); });
$lbStacked.addEventListener('click', function() { setLayout('stacked'); });
$lbOne.addEventListener('click',     function() { setLayout('one'); });
$lbNone.addEventListener('click',    function() { setLayout('none'); });
// Format buttons
function setFormat(fmt) {
  S.format = fmt;
  var f = FORMATS[fmt];
  if (W !== f.w || H !== f.h) {
    W = f.w; H = f.h;
    cv.width = W; cv.height = H;
    rebuildGradient();
  }
  for (var i = 0; i < $fmtBtns.length; i++) {
    var isOn = $fmtBtns[i].getAttribute('data-fmt') === fmt;
    $fmtBtns[i].classList.toggle('on', isOn);
    $fmtBtns[i].setAttribute('aria-checked', String(isOn));
  }
  $hint.textContent = fmt + ' Format \u00b7 ' + W + ' \u00d7 ' + H + ' px';
  refreshCounts();
  saveState();
  scheduleDraw();
}
for (let fi = 0; fi < $fmtBtns.length; fi++) {
  $fmtBtns[fi].addEventListener('click', function() {
    setFormat(this.getAttribute('data-fmt'));
  });
}
// LinkedIn Safe Zone toggle
$btnSafeZone.addEventListener('click', function() {
  showSafeZone = !showSafeZone;
  this.classList.toggle('on', showSafeZone);
  this.setAttribute('aria-checked', String(showSafeZone));
  scheduleDraw();
});
// Swap button
$swapBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  var t;
  t = S.imgs[0];  S.imgs[0]  = S.imgs[1];  S.imgs[1]  = t;
  t = S.blobs[0]; S.blobs[0] = S.blobs[1]; S.blobs[1] = t;
  t = S.creds[0]; S.creds[0] = S.creds[1]; S.creds[1] = t;
  t = S.crop[0];  S.crop[0]  = S.crop[1];  S.crop[1]  = t;
  saveState();
  renderUI();
  saveDraft();
});
// Image loading
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
function loadImageFile(i, file) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    if (file) showToast('\u26a0 Nur JPG, PNG, WebP oder GIF');
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    showToast('\u26a0 Bild zu gro\u00df (max. 8 MB)');
    return;
  }
  revokeBlob(i);
  var blobUrl = URL.createObjectURL(file);
  var im = new Image();
  im.onload = function() {
    S.imgs[i] = im;
    S.blobs[i] = blobUrl;
    S.crop[i] = defaultCrop();
    // Compress once on upload for draft persistence
    compressImage(im, 2000, 0.85).then(function(blob) {
      S.draftBlobs[i] = blob;
      saveDraft();
    }).catch(function() {
      S.draftBlobs[i] = null;
      saveDraft();
    });
    renderUI();
  };
  im.onerror = function() {
    URL.revokeObjectURL(blobUrl);
    showToast('\u26a0 Bild konnte nicht geladen werden');
    $f[i].value = '';
  };
  im.src = blobUrl;
}
// Image zones + crop sliders + credit inputs
[0, 1].forEach(function(i) {
  function openFilePicker() {
    $f[i].click();
  }
  $z[i].addEventListener('click', function(e) {
    if (e.target === $rm[i]) return;
    openFilePicker();
  });
  // Keyboard support for image zones
  $z[i].addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  });
  $f[i].addEventListener('change', function() {
    loadImageFile(i, this.files[0]);
  });
  // Drag & Drop
  $z[i].addEventListener('dragover', function(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.add('dragover');
  });
  $z[i].addEventListener('dragleave', function(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.remove('dragover');
  });
  $z[i].addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.remove('dragover');
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImageFile(i, file);
  });
  // Remove image
  $rm[i].addEventListener('click', function(e) {
    e.stopPropagation();
    revokeBlob(i);
    S.imgs[i] = null; S.creds[i] = ''; S.crop[i] = defaultCrop();
    $f[i].value = '';
    saveState();
    renderUI();
    saveDraft();
  });
  // Crop sliders (zoom, horizontal, vertical)
  $sz[i].addEventListener('input', function() {
    S.crop[i].z = +this.value;
    $vz[i].textContent = this.value + '%';
    scheduleDraw();
  });
  $sz[i].addEventListener('change', function() { saveDraft(); });
  $sx[i].addEventListener('input', function() {
    S.crop[i].x = +this.value;
    $vx[i].textContent = this.value + '%';
    scheduleDraw();
  });
  $sx[i].addEventListener('change', function() { saveDraft(); });
  $sy[i].addEventListener('input', function() {
    S.crop[i].y = +this.value;
    $vy[i].textContent = this.value + '%';
    scheduleDraw();
  });
  $sy[i].addEventListener('change', function() { saveDraft(); });
  // Credit input
  $cr[i].addEventListener('input', function() {
    S.creds[i] = this.value;
    debouncedSave();
    saveDraft();
    scheduleDraw();
  });
});
// ===== DRAW HELPERS =====
function prepareText(maxW) {
  cx.save(); // isolate font side-effects from measurement phase
  var headlineText = S.hlLines.join('\n');
  if (S.hlCaps) headlineText = headlineText.toUpperCase();
  var isNone = (S.layout === 'none');
  var isStacked = (S.layout === 'stacked');
  var isLandscape = W > H;
  var hlFS, subFS;
  // Auto font sizes based on layout
  if (isNone && isLandscape) {
    hlFS = S.hlLines.length > 1 ? 140 : 160;
    subFS = 60;
  } else if (isNone) {
    hlFS = S.hlLines.length > 1 ? 230 : 260;
    subFS = 90;
  } else if (isStacked && isLandscape) {
    hlFS = S.hlLines.length > 1 ? 64 : 74;
    subFS = 36;
  } else if (isLandscape) {
    hlFS = S.hlLines.length > 1 ? 78 : 88;
    subFS = 42;
  } else if (isStacked) {
    hlFS = S.hlLines.length > 1 ? 110 : 120;
    subFS = 54;
  } else {
    hlFS = S.hlLines.length > 1 ? 120 : 130;
    subFS = 60;
  }
  // Manual overrides
  if (S.hlFSOverride > 0) hlFS = S.hlFSOverride;
  if (S.subFSOverride > 0) subFS = S.subFSOverride;
  // Auto-shrink headline
  var rawLines = headlineText.split('\n');
  cx.font = 'bold ' + hlFS + 'px Festivo, serif';
  var worstRatio = 1;
  if (S.hlFSOverride > 0) {
    // Manual override: only shrink if a single WORD is wider than maxW
    // (let wrapLine handle multi-word line breaks at the chosen size)
    for (var k = 0; k < rawLines.length; k++) {
      var words = rawLines[k].split(' ');
      for (var wi = 0; wi < words.length; wi++) {
        var ww = cachedMeasure(words[wi]);
        if (ww > maxW) {
          var ratio = maxW / ww;
          if (ratio < worstRatio) worstRatio = ratio;
        }
      }
    }
  } else {
    // Auto mode: shrink if any full line is wider than maxW
    for (var k = 0; k < rawLines.length; k++) {
      var mw = cachedMeasure(rawLines[k]);
      if (mw > maxW) {
        var ratio = maxW / mw;
        if (ratio < worstRatio) worstRatio = ratio;
      }
    }
  }
  if (worstRatio < 1) {
    hlFS = Math.max(Math.floor(hlFS * worstRatio), isLandscape ? 60 : HL_MIN_FS);
  }
  // Word-wrap headline
  var hlArr = [];
  for (var r = 0; r < rawLines.length; r++) {
    var wrapped = wrapLine(rawLines[r], hlFS, maxW);
    for (var wr = 0; wr < wrapped.length && hlArr.length < HL_MAX_LINES; wr++) {
      hlArr.push(wrapped[wr]);
    }
  }
  // Subtitle — manual line breaks via Enter
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
  cx.restore(); // end measurement phase
  return { hlArr: hlArr, hlFS: hlFS, subArr: subArr, subFS: subFS, isNone: isNone, isLandscape: isLandscape };
}
function drawText(t, maxW) {
  var hlLineH = Math.round(t.hlFS * HL_LINE_H_FACTOR);
  var hlBlockH = t.hlArr.length * hlLineH;
  var subLineH = Math.round(t.subFS * SUB_LINE_H_FACTOR);
  var subBlockH = t.subArr.length > 0 ? t.subArr.length * subLineH : 0;
  var subGap = t.isNone ? (t.isLandscape ? 12 : 20) : t.isLandscape ? 8 : 14;
  // Y position
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
  // Headline (centered)
  cx.font = 'bold ' + t.hlFS + 'px Festivo, serif';
  cx.fillStyle = '#ffffff';
  cx.textBaseline = 'top';
  cx.textAlign = 'center';
  var centerX = W / 2;
  for (var li = 0; li < t.hlArr.length; li++) {
    cx.fillText(t.hlArr[li], centerX, curY + li * hlLineH);
  }
  curY += hlBlockH;
  // Subtitle (centered)
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
  var isLandscape = W > H;
  var topPad = isLandscape ? 36 : TOP_PAD;
  var footerH = isLandscape ? 70 : FOOTER_H;
  var imgTopGap = isLandscape ? 14 : IMG_TOP_GAP;
  // Calculate text block height to reserve space at bottom
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
  // Headline (centered)
  cx.font = 'bold ' + t.hlFS + 'px Festivo, serif';
  cx.fillStyle = '#ffffff';
  cx.textBaseline = 'top';
  cx.textAlign = 'center';
  var centerX = W / 2;
  for (var li = 0; li < t.hlArr.length; li++) {
    cx.fillText(t.hlArr[li], centerX, curY + li * hlLineH);
  }
  curY += hlBlockH;
  // Subtitle (centered)
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
function draw() {
  cx.drawImage(gradCV, 0, 0, 1, H, 0, 0, W, H);
  var maxW = W - MX * 2;
  var t = prepareText(maxW);
  if (S.textPos === 'bottom' && !t.isNone) {
    // Images at top, text at bottom
    var imgEndY = drawImagesAtTop(t);
    drawTextAtBottom(t, maxW, imgEndY);
  } else {
    var curY = drawText(t, maxW);
    if (!t.isNone) drawImages(curY);
  }
  drawFooter();
}
// ===== DRAW CROPPED IMAGE =====
function drawCroppedImage(idx, dx, dy, dw, dh) {
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
  // Apply crop-height: reduce visible area symmetrically from top/bottom
  var ch = (crop.cropH || 100) / 100;
  if (ch < 1) {
    var trimmed = dh * (1 - ch);
    dy += trimmed / 2;
    dh = dh * ch;
  }
  var iw = img.naturalWidth, ih = img.naturalHeight;
  // fillScale = scale at which image exactly covers destination (object-fit: cover)
  var fillScale = Math.max(dw / iw, dh / ih);
  // z=100 → fill, z<100 → zoom out (show more), z>100 → zoom in
  var scale = fillScale * (crop.z / 100);
  var drawW = iw * scale;
  var drawH = ih * scale;
  // How much the drawn image overflows (positive) or underflows (negative) the dest
  var overflowX = drawW - dw;
  var overflowY = drawH - dh;
  // Position: at 0% align left/top edge, at 50% center, at 100% align right/bottom edge
  var imgX = dx - overflowX * (crop.x / 100);
  var imgY = dy - overflowY * (crop.y / 100);
  // Clip to destination rect and draw
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
  // Credit text (drawn outside clip) — Cambria font
  if (S.creds[idx]) {
    cx.save();
    var credFS = S.credFSOverride > 0 ? S.credFSOverride : Math.max(16, Math.round(dh * 0.04));
    cx.font = '500 ' + credFS + 'px Cambria,"Times New Roman",serif';
    cx.fillStyle = 'rgba(255,255,255,0.85)';
    var align = S.credAlign || 'right';
    var credX, pad = 10;
    if (align === 'left') {
      cx.textAlign = 'left';
      credX = dx + pad;
    } else if (align === 'center') {
      cx.textAlign = 'center';
      credX = dx + dw / 2;
    } else {
      cx.textAlign = 'right';
      credX = dx + dw - pad;
    }
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
// ===== HISTORY: ARCHIVE POST =====
function buildSlideData(snap) {
  return {
    headline: snap.hlLines.join('\n'),
    subtitle: snap.subText,
    date: snap.dateText,
    layout: snap.layout,
    format: snap.format || S.format,
    hlCaps: snap.hlCaps,
    subCaps: snap.subCaps,
    hlFSOverride: snap.hlFSOverride,
    subFSOverride: snap.subFSOverride,
    credFSOverride: snap.credFSOverride,
    credAlign: snap.credAlign,
    credOffX: snap.credOffX,
    credOffY: snap.credOffY,
    credShadow: snap.credShadow,
    textPos: snap.textPos,
    credits: snap.creds.slice(),
    crops: snap.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; })
  };
}
function compressSlideImages(snap) {
  var promises = [];
  for (var i = 0; i < 2; i++) {
    if (snap.imgs[i]) {
      promises.push(compressImage(snap.imgs[i]));
    } else {
      promises.push(Promise.resolve(null));
    }
  }
  return Promise.all(promises);
}
$bA.addEventListener('click', function() {
  var btn = this;
  if (btn.disabled) return;
  // Check if there's anything to save (consider all carousel slides if active)
  var hasContent = false;
  if (deckActive && deck.length >= 1) {
    saveCurrentSlide(); // ensure current editor state is in deck
    for (var ci = 0; ci < deck.length; ci++) {
      var ds = deck[ci];
      if ((ds.hlLines.join('').trim()) || ds.subText.trim() || ds.imgs[0] || ds.imgs[1]) {
        hasContent = true; break;
      }
    }
  } else {
    hasContent = S.hlLines.join('').trim() || S.subText.trim() || S.imgs[0] || S.imgs[1];
  }
  if (!hasContent) {
    showToast('\u26a0 Nichts zum Speichern');
    return;
  }
  btn.disabled = true; setSaveLabel('Speichert\u2026');
  showLoading();

  // If carousel mode active, save all slides (even if only 1 slide)
  if (deckActive && deck.length >= 1) {
    // saveCurrentSlide() was already called during the empty check above
    // Save all slides in carousel
    var slidePromises = [];
    for (var si = 0; si < deck.length; si++) {
      slidePromises.push(compressSlideImages(deck[si]));
    }
    // Generate thumbnail from first slide
    var origSnap = slideSnapshot();
    loadSlideState(deck[0]);
    _origDraw();
    var thumbPromise = canvasToThumbnail(cv);
    // Restore current slide
    loadSlideState(origSnap);
    _origDraw();

    Promise.all([Promise.all(slidePromises), thumbPromise]).then(function(allResults) {
      var allSlideImages = allResults[0]; // array of [img0, img1] per slide
      var thumbnail = allResults[1];
      var slides = [];
      for (var j = 0; j < deck.length; j++) {
        var sd = buildSlideData(deck[j]);
        sd.images = [allSlideImages[j][0], allSlideImages[j][1]];
        slides.push(sd);
      }
      var postId = _loadedPostId || generatePostId();
      var post = {
        id: postId,
        savedAt: new Date().toISOString(),
        // Top-level fields from first slide (for backward-compat display in history)
        headline: slides[0].headline,
        subtitle: slides[0].subtitle,
        date: slides[0].date,
        layout: slides[0].layout,
        format: S.format,
        hlCaps: slides[0].hlCaps,
        subCaps: slides[0].subCaps,
        hlFSOverride: slides[0].hlFSOverride,
        subFSOverride: slides[0].subFSOverride,
        credFSOverride: slides[0].credFSOverride,
        credAlign: slides[0].credAlign,
        credOffX: slides[0].credOffX,
        credOffY: slides[0].credOffY,
        credShadow: slides[0].credShadow,
        textPos: slides[0].textPos,
        credits: slides[0].credits,
        crops: slides[0].crops,
        thumbnail: thumbnail,
        images: slides[0].images,
        // Carousel-specific data
        isCarousel: true,
        slides: slides
      };
      return dbAdd(post).then(function() { return post; });
    }).then(function(post) {
      var wasOverwrite = !!_loadedPostId;
      syncToCloud(post);
      _loadedPostId = post.id;
      setSaveLabel('\u2713 Gespeichert!');
      btn.classList.add('btn-success');
      markSaved();
      showToast('\u2713 Karussell mit ' + post.slides.length + ' Slides ' + (wasOverwrite ? '\u00fcberschrieben' : 'gespeichert'));
      setTimeout(function() {
        btn.disabled = false;
        updateSaveButtonLabel();
        btn.classList.remove('btn-success');
      }, 1500);
    }).catch(function(err) {
      console.warn('Carousel save failed:', err);
      btn.disabled = false; updateSaveButtonLabel();
      showToast('\u26a0 Speichern fehlgeschlagen');
    }).finally(hideLoading);
    return;
  }

  // Single-slide save (original logic)
  draw();
  var promises = [];
  // Compress images
  for (var i = 0; i < 2; i++) {
    if (S.imgs[i]) {
      promises.push(compressImage(S.imgs[i]));
    } else {
      promises.push(Promise.resolve(null));
    }
  }
  // Generate thumbnail
  promises.push(canvasToThumbnail(cv));
  Promise.all(promises).then(function(results) {
    var postId = _loadedPostId || generatePostId();
    var post = {
      id: postId,
      savedAt: new Date().toISOString(),
      headline: S.hlLines.join('\n'),
      subtitle: S.subText,
      date: S.dateText,
      layout: S.layout,
      format: S.format,
      hlCaps: S.hlCaps,
      subCaps: S.subCaps,
      hlFSOverride: S.hlFSOverride,
      subFSOverride: S.subFSOverride,
      credFSOverride: S.credFSOverride,
      credAlign: S.credAlign,
      credOffX: S.credOffX,
      credOffY: S.credOffY,
      credShadow: S.credShadow,
      textPos: S.textPos,
      credits: S.creds.slice(),
      crops: S.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; }),
      thumbnail: results[2],
      images: [results[0], results[1]]
    };
    return dbAdd(post).then(function() { return post; });
  }).then(function(post) {
    var wasOverwrite = !!_loadedPostId;
    syncToCloud(post);
    _loadedPostId = post.id;
    setSaveLabel('\u2713 Gespeichert!');
    btn.classList.add('btn-success');
    markSaved();
    showToast('\u2713 Post ' + (wasOverwrite ? '\u00fcberschrieben' : 'gespeichert'));
    setTimeout(function() {
      btn.disabled = false;
      updateSaveButtonLabel();
      btn.classList.remove('btn-success');
    }, 1500);
  }).catch(function(err) {
    console.warn('Save failed:', err);
    btn.disabled = false; updateSaveButtonLabel();
    showToast('\u26a0 Speichern fehlgeschlagen');
  }).finally(hideLoading);
});
// ===== HISTORY: DRAWER =====
let _drawerEscHandler = null;
let _drawerTrapHandler = null;
function openHistory() {
  $histOverlay.classList.add('open');
  $histDrawer.classList.add('open');
  loadHistoryGrid();
  // Focus the close button
  $histClose.focus();
  // Escape key handler
  _drawerEscHandler = function(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeHistory(); }
  };
  document.addEventListener('keydown', _drawerEscHandler);
  // Focus trap
  _drawerTrapHandler = function(e) {
    if (e.key !== 'Tab') return;
    var focusable = $histDrawer.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', _drawerTrapHandler);
}
function closeHistory() {
  $histOverlay.classList.remove('open');
  $histDrawer.classList.remove('open');
  if (_drawerEscHandler) { document.removeEventListener('keydown', _drawerEscHandler); _drawerEscHandler = null; }
  if (_drawerTrapHandler) { document.removeEventListener('keydown', _drawerTrapHandler); _drawerTrapHandler = null; }
  $bH.focus();
}
$bH.addEventListener('click', openHistory);
$histClose.addEventListener('click', closeHistory);
$histOverlay.addEventListener('click', closeHistory);
let activeThumbUrls = [];
let _histPosts = [];
let _loadedPostId = null; // ID of post loaded from archive (for overwrite-on-save)
// Event delegation for history grid (avoids per-item listener leaks)
$histGrid.addEventListener('click', function(e) {
  var delBtn = e.target.closest('.hist-del');
  if (delBtn) {
    e.stopPropagation();
    var idx = +delBtn.getAttribute('data-idx');
    var post = _histPosts[idx];
    if (!post || !confirm('Gespeicherten Post l\u00f6schen?')) return;
    _recentlyDeletedIds[post.id] = true;
    var slideCount = post.isCarousel && post.slides ? post.slides.length : 1;
    Promise.all([
      dbDelete(post.id),
      deleteFromCloud(post.id, slideCount)
    ]).then(function() {
      delete _recentlyDeletedIds[post.id];
      loadHistoryGrid();
      showToast('\u2713 Post gel\u00f6scht');
    }).catch(function() {
      delete _recentlyDeletedIds[post.id];
      loadHistoryGrid();
      showToast('\u2713 Post lokal gel\u00f6scht');
    });
    return;
  }
  var item = e.target.closest('.hist-item');
  if (item) {
    var idx2 = +item.getAttribute('data-idx');
    var post2 = _histPosts[idx2];
    if (post2) loadArchivedPost(post2);
  }
});
$histGrid.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var item = e.target.closest('.hist-item');
  if (item) {
    e.preventDefault();
    var idx = +item.getAttribute('data-idx');
    var post = _histPosts[idx];
    if (post) loadArchivedPost(post);
  }
});
let histFilter = 'all'; // 'all', 'single', 'carousel'
const $histFilterAll = document.getElementById('histFilterAll');
const $histFilterSingle = document.getElementById('histFilterSingle');
const $histFilterCarousel = document.getElementById('histFilterCarousel');
function setHistFilter(f) {
  histFilter = f;
  [$histFilterAll, $histFilterSingle, $histFilterCarousel].forEach(function(btn) {
    var m = btn.id.replace('histFilter', '').toLowerCase();
    btn.classList.toggle('active', m === f);
  });
  loadHistoryGrid();
}
$histFilterAll.addEventListener('click', function() { setHistFilter('all'); });
$histFilterSingle.addEventListener('click', function() { setHistFilter('single'); });
$histFilterCarousel.addEventListener('click', function() { setHistFilter('carousel'); });

function loadHistoryGrid() {
  // Vorherige Blob-URLs aufräumen bevor DOM zerstört wird
  activeThumbUrls.forEach(function(u) { URL.revokeObjectURL(u); });
  activeThumbUrls = [];
  dbGetAll().then(function(allPosts) {
    // Apply filter
    var posts = allPosts;
    if (histFilter === 'single') posts = allPosts.filter(function(p) { return !p.isCarousel; });
    else if (histFilter === 'carousel') posts = allPosts.filter(function(p) { return !!p.isCarousel; });
    _histPosts = posts;
    while ($histGrid.firstChild) $histGrid.removeChild($histGrid.firstChild);
    $histEmpty.textContent = posts.length ? '' : (histFilter === 'all' ? 'Noch keine Posts gespeichert.' : 'Keine ' + (histFilter === 'carousel' ? 'Karussells' : 'Einzelposts') + ' gespeichert.');
    $histEmpty.style.display = posts.length ? 'none' : 'block';
    var countEl = document.getElementById('histCount');
    if (countEl) countEl.textContent = allPosts.length ? allPosts.length + ' / ' + MAX_ARCHIVE_POSTS + ' Posts' : '';
    posts.forEach(function(post, pi) {
      var item = document.createElement('div');
      item.className = 'hist-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('data-idx', pi);
      item.setAttribute('aria-label', 'Post laden: ' + (post.headline || 'Ohne Titel'));
      // Thumbnail
      var img = document.createElement('img');
      img.style.background = 'linear-gradient(180deg, #1a1a3e 0%, #0a0a1a 100%)';
      if (post.thumbnail) {
        var thumbUrl = URL.createObjectURL(post.thumbnail);
        activeThumbUrls.push(thumbUrl);
        img.src = thumbUrl;
      } else if (post.thumbnailUrl) {
        // Blob missing — use cloud URL directly (bypasses CORS issues with fetch)
        img.src = post.thumbnailUrl;
      }
      img.alt = post.headline || 'Post';
      item.appendChild(img);
      // Info
      var info = document.createElement('div');
      info.className = 'hist-item-info';
      var title = document.createElement('div');
      title.className = 'hist-item-title';
      title.textContent = post.headline || 'Ohne Titel';
      info.appendChild(title);
      var date = document.createElement('div');
      date.className = 'hist-item-date';
      date.textContent = post.date || new Date(post.savedAt).toLocaleDateString('de-DE');
      if (post.isCarousel && post.slides) {
        date.textContent += ' \u00b7 ' + post.slides.length + ' Slides';
      }
      info.appendChild(date);
      item.appendChild(info);
      // Delete button
      var del = document.createElement('button');
      del.className = 'hist-del';
      del.textContent = '\u00d7';
      del.setAttribute('aria-label', 'Post l\u00f6schen');
      del.setAttribute('data-idx', pi);
      item.appendChild(del);
      $histGrid.appendChild(item);
    });
  }).catch(function(err) {
    console.warn('loadHistoryGrid failed:', err);
    $histEmpty.style.display = 'block';
    $histEmpty.textContent = 'Fehler beim Laden der Posts.';
  });
}
// ===== HISTORY: LOAD POST =====
function loadArchivedPost(post) {
  var hasContent = S.imgs[0] || S.imgs[1] || S.hlLines.join('').trim() || S.subText.trim();
  var confirmMsg = 'Aktuellen Post ersetzen und gespeicherten Post laden?';
  if (deckActive && deck.length > 1) {
    confirmMsg = 'Aktuelles Karussell (' + deck.length + ' Slides) ersetzen und gespeicherten Post laden?';
  }
  if (hasContent && !confirm(confirmMsg)) return;
  // Force-reset to single-post mode (will be switched to carousel if loading carousel post)
  setToolMode('single', true);
  // Clean up current images
  revokeBlob(0); revokeBlob(1);
  S.imgs = [null, null]; S.blobs = [null, null]; S.draftBlobs = [null, null];
  // Restore metadata
  S.hlLines = post.headline ? post.headline.split('\n') : [''];
  S.subText = post.subtitle || '';
  S.dateText = post.date || todayDE();
  S.hlCaps = !!(post.hlCaps || post.allCaps);
  S.subCaps = !!post.subCaps;
  S.hlFSOverride = post.hlFSOverride || 0;
  S.subFSOverride = post.subFSOverride || 0;
  S.credFSOverride = post.credFSOverride || 0;
  S.credAlign = post.credAlign || 'right';
  S.credOffX = post.credOffX || 0;
  S.credOffY = post.credOffY || 0;
  S.credShadow = !!post.credShadow;
  S.layout = post.layout || 'one';
  S.format = post.format || '4:5';
  S.textPos = post.textPos || 'top';
  S.creds = (Array.isArray(post.credits) && post.credits.length === 2) ? post.credits.slice() : ['', ''];
  S.crop = (Array.isArray(post.crops) && post.crops.length === 2)
    ? post.crops.map(function(c) {
        if (c && typeof c === 'object' && 'x' in c) return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100};
        if (typeof c === 'number') return {x:c, y:c, z:100};
        return defaultCrop();
      })
    : [defaultCrop(), defaultCrop()];
  // Update UI from restored state
  refreshEditorFromState();
  $f[0].value = ''; $f[1].value = '';
  // Load images from blobs
  var loaded = 0, total = 0;
  function onAllLoaded() {
    autoSize($hl); autoSize($sub);
    renderUI(); saveState();
    closeHistory();
    // Track loaded post for overwrite-on-save (skip draft pseudo-posts)
    if (post.id && post.id !== '__draft__') {
      _loadedPostId = post.id;
    }
    updateSaveButtonLabel();
    // If this is a carousel post, restore all slides
    if (post.isCarousel && Array.isArray(post.slides) && post.slides.length >= 1) {
      // Revoke temporary blob URLs created above — loadCarouselPost will create its own
      revokeBlob(0); revokeBlob(1);
      loadCarouselPost(post);
    } else if (post.isCarousel) {
      // Carousel-Post but slides missing/empty — load as single post with warning
      showToast('\u26a0 Karussell-Daten besch\u00e4digt \u2013 als Einzelpost geladen');
    } else {
      showToast('\u2713 Post geladen');
    }
  }
  function loadImageBlob(idx, blob) {
    S.draftBlobs[idx] = blob;
    var blobUrl = URL.createObjectURL(blob);
    var im = new Image();
    im.onload = function() {
      S.imgs[idx] = im;
      S.blobs[idx] = blobUrl;
      loaded++;
      if (loaded >= total) onAllLoaded();
    };
    im.onerror = function() {
      URL.revokeObjectURL(blobUrl);
      loaded++;
      if (loaded >= total) onAllLoaded();
    };
    im.src = blobUrl;
  }
  for (var i = 0; i < 2; i++) {
    var hasBlob = post.images && post.images[i];
    var hasCloudUrl = !hasBlob && post.cloudImageUrls && post.cloudImageUrls[0] && post.cloudImageUrls[0][i];
    if (hasBlob) {
      total++;
      loadImageBlob(i, post.images[i]);
    } else if (hasCloudUrl) {
      total++;
      (function(idx, url) {
        loadCloudImage(url).then(function(r) {
          if (r.img) S.imgs[idx] = r.img;
          if (r.blob) {
            S.draftBlobs[idx] = r.blob;
            S.blobs[idx] = URL.createObjectURL(r.blob);
            if (!post.images) post.images = [null, null];
            post.images[idx] = r.blob;
            dbAdd(post).catch(function() {});
          }
          loaded++;
          if (loaded >= total) onAllLoaded();
        });
      })(i, post.cloudImageUrls[0][i]);
    }
  }
  if (total === 0) onAllLoaded();
}
function loadSlideFromSaved(slideData) {
  return {
    imgs: [null, null],
    blobs: [null, null],
    draftBlobs: [null, null],
    creds: (Array.isArray(slideData.credits) && slideData.credits.length === 2) ? slideData.credits.slice() : ['', ''],
    crop: (Array.isArray(slideData.crops) && slideData.crops.length === 2)
      ? slideData.crops.map(function(c) {
          if (c && typeof c === 'object' && 'x' in c) return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100};
          return defaultCrop();
        })
      : [defaultCrop(), defaultCrop()],
    layout: slideData.layout || 'one',
    format: slideData.format || S.format,
    hlCaps: !!slideData.hlCaps,
    subCaps: !!slideData.subCaps,
    hlLines: slideData.headline ? slideData.headline.split('\n') : [''],
    subText: slideData.subtitle || '',
    dateText: slideData.date || todayDE(),
    hlFSOverride: slideData.hlFSOverride || 0,
    subFSOverride: slideData.subFSOverride || 0,
    credFSOverride: slideData.credFSOverride || 0,
    credAlign: slideData.credAlign || 'right',
    credOffX: slideData.credOffX || 0,
    credOffY: slideData.credOffY || 0,
    credShadow: !!slideData.credShadow,
    textPos: slideData.textPos || 'top'
  };
}
function loadCarouselPost(post) {
  // Stop existing carousel if active
  if (deckActive) { revokeDeckBlobs(); deckActive = false; deck = []; }
  // Build deck from saved slides
  var slides = post.slides;
  deck = [];
  var totalImgs = 0, loadedImgs = 0;
  for (var si = 0; si < slides.length; si++) {
    deck.push(loadSlideFromSaved(slides[si]));
  }
  // Count images to load across all slides (including cloud fallbacks)
  for (var si2 = 0; si2 < slides.length; si2++) {
    for (var ii = 0; ii < 2; ii++) {
      var hasBlob2 = slides[si2].images && slides[si2].images[ii];
      var hasCloudUrl2 = !hasBlob2 && post.cloudImageUrls && post.cloudImageUrls[si2] && post.cloudImageUrls[si2][ii];
      if (hasBlob2 || hasCloudUrl2) totalImgs++;
    }
  }
  function onAllCarouselImgsLoaded() {
    // Activate carousel mode with pre-built deck
    deckActive = true;
    deckThumbCache = deck.map(function() { return null; });
    currentSlideIdx = 0;
    loadSlideState(deck[0]);
    refreshEditorFromState();
    $deckBar.classList.add('active');
    // Sync tab UI to carousel mode directly (no confirm needed since we're loading a saved post)
    currentToolMode = 'carousel';
    $appDiv.classList.remove('mode-single');
    $appDiv.classList.add('mode-carousel');
    $tabSingle.classList.remove('active');
    $tabCarousel.classList.add('active');
    $tabSingle.setAttribute('aria-selected', 'false');
    $tabCarousel.setAttribute('aria-selected', 'true');
    updateSaveButtonLabel();
    _origDraw();
    renderDeckStrip();
    showToast('\u2713 Karussell mit ' + deck.length + ' Slides geladen');
  }
  if (totalImgs === 0) {
    onAllCarouselImgsLoaded();
    return;
  }
  // Load images for each slide (with cloud URL fallback)
  function loadCarouselImageBlob(slideIdx, imgIdx, blob) {
    deck[slideIdx].draftBlobs[imgIdx] = blob;
    var blobUrl = URL.createObjectURL(blob);
    var im = new Image();
    im.onload = function() {
      deck[slideIdx].imgs[imgIdx] = im;
      deck[slideIdx].blobs[imgIdx] = blobUrl;
      loadedImgs++;
      if (loadedImgs >= totalImgs) onAllCarouselImgsLoaded();
    };
    im.onerror = function() {
      URL.revokeObjectURL(blobUrl);
      loadedImgs++;
      if (loadedImgs >= totalImgs) onAllCarouselImgsLoaded();
    };
    im.src = blobUrl;
  }
  for (var si3 = 0; si3 < slides.length; si3++) {
    for (var ii2 = 0; ii2 < 2; ii2++) {
      var hasSlideBlob = slides[si3].images && slides[si3].images[ii2];
      var hasSlideCloudUrl = !hasSlideBlob && post.cloudImageUrls && post.cloudImageUrls[si3] && post.cloudImageUrls[si3][ii2];
      if (hasSlideBlob) {
        loadCarouselImageBlob(si3, ii2, slides[si3].images[ii2]);
      } else if (hasSlideCloudUrl) {
        (function(sIdx, iIdx, url) {
          loadCloudImage(url).then(function(r) {
            if (r.img) deck[sIdx].imgs[iIdx] = r.img;
            if (r.blob) {
              deck[sIdx].draftBlobs[iIdx] = r.blob;
              deck[sIdx].blobs[iIdx] = URL.createObjectURL(r.blob);
              if (!slides[sIdx].images) slides[sIdx].images = [null, null];
              slides[sIdx].images[iIdx] = r.blob;
              dbAdd(post).catch(function() {});
            }
            loadedImgs++;
            if (loadedImgs >= totalImgs) onAllCarouselImgsLoaded();
          });
        })(si3, ii2, post.cloudImageUrls[si3][ii2]);
      }
    }
  }
}
// ===== GLOBAL DRAG & DROP =====
let dragCounter = 0;
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
  // Load into first empty slot, or slot 0 if single layout
  var slot = 0;
  if (hasTwoImages() && S.imgs[0] && !S.imgs[1]) slot = 1;
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
$fsSlider.addEventListener('input', function() {
  S.hlFSOverride = +this.value;
  $fsVal.textContent = this.value + 'px';
  debouncedSave();
  scheduleDraw();
});
$fsSlider.addEventListener('change', function() { pushUndo(); });
$fsReset.addEventListener('click', function() {
  S.hlFSOverride = 0;
  updateFSSlider();
  pushUndo();
  debouncedSave();
  scheduleDraw();
});
$subFsSlider.addEventListener('input', function() {
  S.subFSOverride = +this.value;
  $subFsVal.textContent = this.value + 'px';
  debouncedSave();
  scheduleDraw();
});
$subFsSlider.addEventListener('change', function() { pushUndo(); });
$subFsReset.addEventListener('click', function() {
  S.subFSOverride = 0;
  updateFSSlider();
  pushUndo();
  debouncedSave();
  scheduleDraw();
});
// Credit font size slider
$credFsSlider.addEventListener('input', function() {
  S.credFSOverride = +this.value;
  $credFsVal.textContent = this.value + 'px';
  debouncedSave();
  scheduleDraw();
});
$credFsSlider.addEventListener('change', function() { pushUndo(); });
$credFsReset.addEventListener('click', function() {
  S.credFSOverride = 0;
  updateFSSlider();
  pushUndo();
  debouncedSave();
  scheduleDraw();
});
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
    saveDraft();
    scheduleDraw();
  });
});
// ===== FLIP BUTTONS =====
document.querySelectorAll('.crop-flip').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var imgIdx = +this.getAttribute('data-img');
    S.crop[imgIdx].flip = !S.crop[imgIdx].flip;
    this.classList.toggle('on', S.crop[imgIdx].flip);
    saveDraft();
    scheduleDraw();
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
      saveDraft();
      scheduleDraw();
    });
  });
});
// ===== TEXT POSITION =====
const TP_BTNS = { top: $tpTop, center: $tpCenter, bottom: $tpBottom };
function setTextPos(pos) {
  S.textPos = pos;
  Object.keys(TP_BTNS).forEach(function(k) {
    TP_BTNS[k].classList.toggle('on', k === pos);
    TP_BTNS[k].setAttribute('aria-checked', String(k === pos));
  });
  pushUndo();
  debouncedSave();
  scheduleDraw();
}
$tpTop.addEventListener('click', function() { setTextPos('top'); });
$tpCenter.addEventListener('click', function() { setTextPos('center'); });
$tpBottom.addEventListener('click', function() { setTextPos('bottom'); });
// ===== CREDIT ALIGNMENT =====
const CA_BTNS = { left: $caLeft, right: $caRight, center: $caCenter };
function setCredAlign(align) {
  S.credAlign = align;
  Object.keys(CA_BTNS).forEach(function(k) {
    CA_BTNS[k].classList.toggle('on', k === align);
    CA_BTNS[k].setAttribute('aria-checked', String(k === align));
  });
  pushUndo();
  debouncedSave();
  scheduleDraw();
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
$credOffXSlider.addEventListener('input', function() {
  S.credOffX = parseInt(this.value, 10);
  $credOffXVal.textContent = S.credOffX;
  debouncedSave();
  scheduleDraw();
});
$credOffXSlider.addEventListener('change', function() { pushUndo(); });
$credOffXReset.addEventListener('click', function() {
  S.credOffX = 0;
  updateCredOffsetUI();
  pushUndo(); debouncedSave(); scheduleDraw();
});
$credOffYSlider.addEventListener('input', function() {
  S.credOffY = parseInt(this.value, 10);
  $credOffYVal.textContent = S.credOffY;
  debouncedSave();
  scheduleDraw();
});
$credOffYSlider.addEventListener('change', function() { pushUndo(); });
$credOffYReset.addEventListener('click', function() {
  S.credOffY = 0;
  updateCredOffsetUI();
  pushUndo(); debouncedSave(); scheduleDraw();
});
// ===== CREDIT SHADOW TOGGLE =====
function updateShadowBtn() {
  $credShadowToggle.classList.toggle('on', S.credShadow);
  $credShadowToggle.textContent = S.credShadow ? 'An' : 'Aus';
  $credShadowToggle.setAttribute('aria-checked', String(S.credShadow));
}
$credShadowToggle.addEventListener('click', function() {
  S.credShadow = !S.credShadow;
  updateShadowBtn();
  pushUndo(); debouncedSave(); scheduleDraw();
});
// ===== DARK MODE TOGGLE =====
const THEME_KEY = 'ki-news-theme';
function applyTheme(theme) {
  document.documentElement.classList.remove('light', 'dark');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.classList.add(theme);
  }
  $themeToggle.textContent = theme === 'light' ? '\u2600' : '\u263e';
  try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
}
(function() {
  var saved = '';
  try { saved = localStorage.getItem(THEME_KEY) || ''; } catch(e) {}
  if (saved === 'light' || saved === 'dark') applyTheme(saved);
})();
$themeToggle.addEventListener('click', function() {
  var cur = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});
// ===== DESIGN THEME SWITCHER =====
const DESIGN_KEY = 'ki-news-design-theme';
const $designToggle = document.getElementById('designToggle');
const $designMenu = document.getElementById('designMenu');
const lgIsFirefox = typeof InstallTrigger !== 'undefined' || navigator.userAgent.indexOf('Firefox') > -1;
const DESIGN_ICONS = { 'default': '\u25c7', 'fluent': '\u25a8', 'liquid-glass': '\u2666', 'm3x': '\u2726', 'geist': '\u25b3' };
const DESIGN_LABELS = { 'default': 'Standard', 'fluent': 'Fluent 2', 'liquid-glass': 'Liquid Glass', 'm3x': 'Material 3', 'geist': 'Geist' };
let currentDesign = 'default';
function applyDesignTheme(theme) {
  var html = document.documentElement;
  html.classList.add('lg-transitioning');
  // Remove all design classes
  Object.keys(DESIGN_LABELS).forEach(function(k) { if (k !== 'default') html.classList.remove(k); });
  html.classList.remove('lg-no-blur');
  currentDesign = theme;
  if (theme !== 'default') html.classList.add(theme);
  if (theme === 'liquid-glass' && lgIsFirefox) html.classList.add('lg-no-blur');
  // Update button icon
  $designToggle.textContent = DESIGN_ICONS[theme] || '\u25c7';
  $designToggle.title = 'Design: ' + (DESIGN_LABELS[theme] || 'Standard');
  // Update menu active state
  var opts = $designMenu.querySelectorAll('.theme-switcher-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].getAttribute('data-design') === theme);
  }
  try { localStorage.setItem(DESIGN_KEY, theme); } catch(e) {}
  // Migrate old LG key
  try { localStorage.removeItem('ki-news-liquid-glass'); } catch(e) {}
  setTimeout(function() {
    html.classList.remove('lg-transitioning');
  }, 500);
}
// Init from localStorage (with migration from old LG key)
(function() {
  var saved = '';
  try { saved = localStorage.getItem(DESIGN_KEY) || ''; } catch(e) {}
  if (!saved) {
    // Migrate old liquid-glass preference
    try {
      var oldLG = localStorage.getItem('ki-news-liquid-glass');
      if (oldLG === '1') saved = 'liquid-glass';
    } catch(e) {}
  }
  if (saved && saved !== 'default') applyDesignTheme(saved);
  else $designToggle.textContent = '\u25c7';
})();
// Toggle menu
$designToggle.addEventListener('click', function(e) {
  e.stopPropagation();
  $designMenu.classList.toggle('show');
});
// Menu option click
$designMenu.addEventListener('click', function(e) {
  var opt = e.target.closest('.theme-switcher-opt');
  if (!opt) return;
  var theme = opt.getAttribute('data-design');
  applyDesignTheme(theme);
  $designMenu.classList.remove('show');
  showToast(DESIGN_LABELS[theme] + ' aktiviert');
});
// Close menu on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.theme-switcher')) {
    $designMenu.classList.remove('show');
  }
});
// ===== UNDO / REDO =====
const undoStack = [];
let redoStack = [];
const MAX_UNDO = 40;
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
  return a.json === b.json && a.imgs[0] === b.imgs[0] && a.imgs[1] === b.imgs[1];
}
function restoreSnapshot(snap) {
  var data;
  try { data = JSON.parse(snap.json); } catch(e) { showToast('\u26a0 Snapshot-Daten besch\u00e4digt'); return; }
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
  // Restore image references
  S.imgs = snap.imgs.slice();
  S.blobs = snap.blobs.slice();
  S.draftBlobs = snap.draftBlobs.slice();
  // Sync UI (reuse shared helper + update crop/credit sliders)
  refreshEditorFromState();
  for (var i = 0; i < 2; i++) {
    $cr[i].value = S.creds[i];
    $sz[i].value = S.crop[i].z; $vz[i].textContent = S.crop[i].z + '%';
    $sx[i].value = S.crop[i].x; $vx[i].textContent = S.crop[i].x + '%';
    $sy[i].value = S.crop[i].y; $vy[i].textContent = S.crop[i].y + '%';
  }
  saveState();
  scheduleDraw();
}
let lastSnap = stateSnapshot();
function pushUndo() {
  var snap = stateSnapshot();
  if (snapshotsEqual(snap, lastSnap)) return;
  undoStack.push(lastSnap);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  lastSnap = snap;
}
let _undoTimer = null;
function flushDebouncedUndo() {
  if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; pushUndo(); }
}
function undo() {
  flushDebouncedUndo();
  if (!undoStack.length) { showToast('Nichts zum R\u00fcckg\u00e4ngig machen'); return; }
  redoStack.push(stateSnapshot());
  var snap = undoStack.pop();
  lastSnap = snap;
  restoreSnapshot(snap);
  showToast('R\u00fcckg\u00e4ngig');
}
function redo() {
  if (!redoStack.length) { showToast('Nichts zum Wiederherstellen'); return; }
  undoStack.push(stateSnapshot());
  var snap = redoStack.pop();
  lastSnap = snap;
  restoreSnapshot(snap);
  showToast('Wiederhergestellt');
}
// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  // Skip when typing in inputs/textareas
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
    if (isInput) return; // let browser handle undo in inputs
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
const TPL_KEY = 'ki-news-templates';
function loadTemplates() {
  try {
    var raw = localStorage.getItem(TPL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}
function saveTemplates(templates) {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(templates)); } catch(e) {}
  syncTemplatesToCloud(templates);
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
  if (!name) { showToast('\u26a0 Bitte Vorlagenname eingeben'); return; }
  if (/[<>"'`\\\/]/.test(name)) { showToast('\u26a0 Sonderzeichen im Namen nicht erlaubt'); return; }
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
  showToast('\u2713 Vorlage "' + name + '" gespeichert');
});
$tplLoad.addEventListener('click', function() {
  var name = $tplSelect.value;
  if (!name) { showToast('\u26a0 Bitte Vorlage w\u00e4hlen'); return; }
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
  saveState();
  scheduleDraw();
  showToast('\u2713 Vorlage "' + name + '" geladen');
});
$tplDel.addEventListener('click', function() {
  var name = $tplSelect.value;
  if (!name) { showToast('\u26a0 Bitte Vorlage w\u00e4hlen'); return; }
  if (!confirm('Vorlage "' + name + '" l\u00f6schen?')) return;
  var templates = loadTemplates();
  delete templates[name];
  saveTemplates(templates);
  refreshTplSelect();
  showToast('\u2713 Vorlage gel\u00f6scht');
});
// Hook undo into existing input handlers (debounced to avoid flooding undo stack per-keystroke)
function debouncedUndo() {
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(pushUndo, 600);
}
$hl.addEventListener('input', debouncedUndo);
$sub.addEventListener('input', debouncedUndo);
$date.addEventListener('change', function() { pushUndo(); });
// ===== FIREBASE CLOUD SYNC =====
const fbEnabled = typeof firebase !== 'undefined';
let fbUser = null;
if (fbEnabled) {
  firebase.initializeApp({
    apiKey: "AIzaSyBuE_T6Uxvwnm4nCNHrRfdWb27zmjboUPk",
    authDomain: "ki-news-post-builder.firebaseapp.com",
    projectId: "ki-news-post-builder",
    storageBucket: "ki-news-post-builder.firebasestorage.app",
    messagingSenderId: "826867698843",
    appId: "1:826867698843:web:df93b3539e9ff959030a3e"
  });
  var fbAuth = firebase.auth();
  var fbDb = firebase.firestore();
  var fbStorage = firebase.storage();
  var $loginBtn = document.getElementById('loginBtn');
  var $userInfo = document.getElementById('userInfo');
  var $userAvatar = document.getElementById('userAvatar');
  var $logoutBtn = document.getElementById('logoutBtn');
  fbAuth.onAuthStateChanged(function(user) {
    fbUser = user;
    if (user) {
      $loginBtn.style.display = 'none';
      $userInfo.style.display = 'flex';
      if (user.photoURL) $userAvatar.src = user.photoURL;
      $userAvatar.alt = user.displayName || '';
      showToast('\u2713 Angemeldet als ' + (user.displayName || user.email));
      syncCloud();
      syncTemplatesFromCloud();
    } else {
      $loginBtn.style.display = '';
      $userInfo.style.display = 'none';
    }
  });
  // Handle redirect result (from previous signInWithRedirect)
  fbAuth.getRedirectResult().catch(function(err) {
    if (err.code && err.code !== 'auth/popup-closed-by-user') {
      showToast('\u26a0 Login: ' + (err.message || err.code));
      console.warn('Redirect login error:', err);
    }
  });
  $loginBtn.addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    $loginBtn.textContent = 'Anmelden\u2026';
    $loginBtn.disabled = true;
    fbAuth.signInWithPopup(provider).catch(function(err) {
      console.warn('Popup login error:', err);
      // Popup blocked or failed → try redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' ||
          err.code === 'auth/operation-not-allowed' || err.code === 'auth/internal-error') {
        showToast('Popup blockiert \u2013 Weiterleitung\u2026');
        return fbAuth.signInWithRedirect(provider);
      }
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup, no error message needed
      } else if (err.code === 'auth/unauthorized-domain') {
        showToast('\u26a0 Domain nicht autorisiert \u2013 bitte in Firebase Console hinzuf\u00fcgen');
      } else {
        showToast('\u26a0 Login: ' + (err.message || err.code));
      }
    }).finally(function() {
      $loginBtn.textContent = 'Anmelden';
      $loginBtn.disabled = false;
    });
  });
  $logoutBtn.addEventListener('click', function() {
    fbAuth.signOut().then(function() {
      showToast('\u2713 Abgemeldet');
    }).catch(function(err) {
      console.warn('Sign out error:', err);
      showToast('\u26a0 Abmeldung fehlgeschlagen');
    });
  });
} else {
  var $loginBtnHide = document.getElementById('loginBtn');
  if ($loginBtnHide) $loginBtnHide.style.display = 'none';
}
function postMetadata(src) {
  return {
    headline: src.headline || '', subtitle: src.subtitle || '', date: src.date || '',
    layout: src.layout || 'one', format: src.format || '4:5',
    hlCaps: !!src.hlCaps, subCaps: !!src.subCaps,
    hlFSOverride: src.hlFSOverride || 0, subFSOverride: src.subFSOverride || 0, credFSOverride: src.credFSOverride || 0,
    credAlign: src.credAlign || 'right', credOffX: src.credOffX || 0, credOffY: src.credOffY || 0,
    credShadow: !!src.credShadow, textPos: src.textPos || 'top',
    credits: src.credits || ['', ''], crops: src.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}]
  };
}
function syncCarouselToCloud(post, uid, basePath, thumbUpload) {
  var slideUploads = [];
  for (var si = 0; si < post.slides.length; si++) {
    for (var ii = 0; ii < 2; ii++) {
      if (post.slides[si].images && post.slides[si].images[ii]) {
        (function(slideIdx, imgIdx) {
          var ref = fbStorage.ref(basePath + '/slide' + slideIdx + '_img' + imgIdx + '.jpg');
          slideUploads.push(
            ref.put(post.slides[slideIdx].images[imgIdx]).then(function(s) {
              return s.ref.getDownloadURL().then(function(url) {
                return { si: slideIdx, ii: imgIdx, url: url };
              });
            })
          );
        })(si, ii);
      }
    }
  }
  return Promise.all([thumbUpload, Promise.all(slideUploads)]).then(function(res) {
    var thumbnailUrl = res[0];
    var slideImageUrls = {};
    res[1].forEach(function(r) { slideImageUrls[r.si + '_' + r.ii] = r.url; });
    var slidesData = post.slides.map(function(s, idx) {
      var meta = postMetadata(s);
      meta.format = s.format || post.format || '4:5';
      meta.imageUrls = [slideImageUrls[idx + '_0'] || null, slideImageUrls[idx + '_1'] || null];
      return meta;
    });
    var doc = postMetadata(post);
    doc.savedAt = post.savedAt;
    doc.imageUrls = [slidesData[0].imageUrls[0], slidesData[0].imageUrls[1]];
    doc.thumbnailUrl = thumbnailUrl;
    doc.isCarousel = true;
    doc.slideCount = post.slides.length;
    doc.slides = slidesData;
    return fbDb.collection('users').doc(uid).collection('posts').doc(post.id).set(doc);
  }).then(function() {
    post.cloudSynced = true;
    return dbAdd(post);
  }).catch(function(err) {
    console.warn('syncToCloud (carousel) failed:', err);
    showToast('\u26a0 Cloud-Sync fehlgeschlagen');
  });
}
function syncSingleToCloud(post, uid, basePath, thumbUpload) {
  var imgUploads = [];
  for (var i = 0; i < 2; i++) {
    if (post.images && post.images[i]) {
      (function(idx) {
        var ref = fbStorage.ref(basePath + '/img' + idx + '.jpg');
        imgUploads.push(ref.put(post.images[idx]).then(function(s) { return s.ref.getDownloadURL(); }));
      })(i);
    } else {
      imgUploads.push(Promise.resolve(null));
    }
  }
  return Promise.all([Promise.all(imgUploads), thumbUpload]).then(function(res) {
    var doc = postMetadata(post);
    doc.savedAt = post.savedAt;
    doc.imageUrls = [res[0][0], res[0][1]];
    doc.thumbnailUrl = res[1];
    doc.isCarousel = false;
    doc.slideCount = 1;
    return fbDb.collection('users').doc(uid).collection('posts').doc(post.id).set(doc);
  }).then(function() {
    post.cloudSynced = true;
    return dbAdd(post);
  }).catch(function(err) {
    console.warn('syncToCloud failed:', err);
    showToast('\u26a0 Cloud-Sync fehlgeschlagen');
  });
}
function syncToCloud(post) {
  if (!fbUser || !fbEnabled) return Promise.resolve();
  var uid = fbUser.uid;
  var basePath = 'users/' + uid + '/posts/' + post.id;
  var thumbUpload = post.thumbnail
    ? fbStorage.ref(basePath + '/thumb.jpg').put(post.thumbnail).then(function(s) { return s.ref.getDownloadURL(); })
    : Promise.resolve(null);
  if (post.isCarousel && post.slides && post.slides.length > 0) {
    return syncCarouselToCloud(post, uid, basePath, thumbUpload);
  }
  return syncSingleToCloud(post, uid, basePath, thumbUpload);
}
// Track recently deleted post IDs so syncCloud won't re-download them
const _recentlyDeletedIds = {};
function deleteFromCloud(postId, slideCount) {
  if (!fbUser || !fbEnabled) return Promise.resolve();
  var uid = fbUser.uid;
  var basePath = 'users/' + uid + '/posts/' + postId;
  var deletes = [
    fbDb.collection('users').doc(uid).collection('posts').doc(postId).delete().catch(function() {}),
    fbStorage.ref(basePath + '/thumb.jpg').delete().catch(function() {}),
    // Legacy single-post image paths
    fbStorage.ref(basePath + '/img0.jpg').delete().catch(function() {}),
    fbStorage.ref(basePath + '/img1.jpg').delete().catch(function() {})
  ];
  // Clean up carousel slide images
  var sc = slideCount || 1;
  for (var si = 0; si < sc; si++) {
    for (var ii = 0; ii < 2; ii++) {
      deletes.push(fbStorage.ref(basePath + '/slide' + si + '_img' + ii + '.jpg').delete().catch(function() {}));
    }
  }
  return Promise.all(deletes);
}
// Load image from URL via <img> element, then convert to blob via canvas.
// This bypasses CORS issues that block fetch() on Firebase Storage URLs.
// Returns {img: Image, blob: Blob|null} — img is always set on success, blob may be null if canvas is tainted.
function loadCloudImage(url) {
  return new Promise(function(resolve) {
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function() {
      try {
        var c = document.createElement('canvas');
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        c.getContext('2d').drawImage(im, 0, 0);
        c.toBlob(function(blob) {
          resolve({ img: im, blob: blob || null });
        }, 'image/jpeg', 0.85);
      } catch (e) {
        resolve({ img: im, blob: null });
      }
    };
    im.onerror = function() {
      // crossOrigin failed — retry without (loads for display, taints canvas)
      var im2 = new Image();
      im2.onload = function() { resolve({ img: im2, blob: null }); };
      im2.onerror = function() { resolve({ img: null, blob: null }); };
      im2.src = url;
    };
    im.src = url;
  });
}
function downloadCloudPost(id, data) {
  // Thumbnail: try fetch first (fast, preserves original quality), fall back to img→canvas
  var thumbFetch = data.thumbnailUrl
    ? fetch(data.thumbnailUrl).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .catch(function() { return loadCloudImage(data.thumbnailUrl).then(function(r) { return r.blob; }); })
    : Promise.resolve(null);

  // Carousel post with slides data
  if (data.isCarousel && data.slides && data.slides.length > 0) {
    var slideImgFetches = [];
    for (var si = 0; si < data.slides.length; si++) {
      for (var ii = 0; ii < 2; ii++) {
        if (data.slides[si].imageUrls && data.slides[si].imageUrls[ii]) {
          (function(slideIdx, imgIdx, url) {
            slideImgFetches.push(
              fetch(url).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
                .then(function(blob) { return { si: slideIdx, ii: imgIdx, blob: blob }; })
                .catch(function() {
                  // fetch failed (CORS) — try img→canvas fallback
                  return loadCloudImage(url).then(function(r) {
                    return { si: slideIdx, ii: imgIdx, blob: r.blob };
                  });
                })
            );
          })(si, ii, data.slides[si].imageUrls[ii]);
        }
      }
    }
    return Promise.all([thumbFetch, Promise.all(slideImgFetches)]).then(function(res) {
      var thumbnail = res[0];
      var imgResults = res[1];
      // Map fetched blobs back to slides
      var slideImgMap = {};
      imgResults.forEach(function(r) { slideImgMap[r.si + '_' + r.ii] = r.blob; });
      var slides = data.slides.map(function(s, idx) {
        var sd = {
          headline: s.headline || '',
          subtitle: s.subtitle || '',
          date: s.date || '',
          layout: s.layout || 'one',
          format: s.format || data.format || '4:5',
          hlCaps: !!s.hlCaps,
          subCaps: !!s.subCaps,
          hlFSOverride: s.hlFSOverride || 0,
          subFSOverride: s.subFSOverride || 0,
          credFSOverride: s.credFSOverride || 0,
          credAlign: s.credAlign || 'right',
          credOffX: s.credOffX || 0,
          credOffY: s.credOffY || 0,
          credShadow: !!s.credShadow,
          textPos: s.textPos || 'top',
          credits: s.credits || ['', ''],
          crops: s.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
          images: [slideImgMap[idx + '_0'] || null, slideImgMap[idx + '_1'] || null]
        };
        return sd;
      });
      return dbAdd({
        id: id,
        savedAt: data.savedAt,
        headline: data.headline || slides[0].headline,
        subtitle: data.subtitle || slides[0].subtitle,
        date: data.date || slides[0].date,
        layout: data.layout || slides[0].layout,
        format: data.format || '4:5',
        hlCaps: !!data.hlCaps,
        subCaps: !!data.subCaps,
        hlFSOverride: data.hlFSOverride || 0,
        subFSOverride: data.subFSOverride || 0,
        credFSOverride: data.credFSOverride || 0,
        credAlign: data.credAlign || 'right',
        credOffX: data.credOffX || 0,
        credOffY: data.credOffY || 0,
        credShadow: !!data.credShadow,
        textPos: data.textPos || 'top',
        credits: data.credits || ['', ''],
        crops: data.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
        images: slides[0].images,
        thumbnail: thumbnail,
        thumbnailUrl: data.thumbnailUrl || null,
        cloudImageUrls: data.slides.map(function(s) { return s.imageUrls || [null, null]; }),
        isCarousel: true,
        slides: slides,
        cloudSynced: true
      });
    });
  }

  // Single-post download
  var imgFetches = [];
  for (var i = 0; i < 2; i++) {
    if (data.imageUrls && data.imageUrls[i]) {
      (function(url) {
        imgFetches.push(
          fetch(url).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
            .catch(function() { return loadCloudImage(url).then(function(r) { return r.blob; }); })
        );
      })(data.imageUrls[i]);
    } else {
      imgFetches.push(Promise.resolve(null));
    }
  }
  return Promise.all([Promise.all(imgFetches), thumbFetch]).then(function(res) {
    var imgBlobs = res[0];
    var thumbnail = res[1];
    return dbAdd({
      id: id,
      savedAt: data.savedAt,
      headline: data.headline,
      subtitle: data.subtitle,
      date: data.date,
      layout: data.layout,
      format: data.format,
      hlCaps: data.hlCaps,
      subCaps: data.subCaps,
      hlFSOverride: data.hlFSOverride || 0,
      subFSOverride: data.subFSOverride || 0,
      credFSOverride: data.credFSOverride || 0,
      credAlign: data.credAlign || 'right',
      credOffX: data.credOffX || 0,
      credOffY: data.credOffY || 0,
      credShadow: !!data.credShadow,
      textPos: data.textPos || 'top',
      credits: data.credits || ['', ''],
      crops: data.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
      images: [imgBlobs[0], imgBlobs[1]],
      thumbnail: thumbnail,
      thumbnailUrl: data.thumbnailUrl || null,
      cloudImageUrls: [data.imageUrls || [null, null]],
      cloudSynced: true
    });
  });
}
function syncCloud() {
  if (!fbUser || !fbEnabled) return;
  var uid = fbUser.uid;
  Promise.all([
    dbGetAll(),
    fbDb.collection('users').doc(uid).collection('posts').orderBy('savedAt', 'desc').get()
  ]).then(function(res) {
    var localPosts = res[0], cloudSnap = res[1];
    var localById = {};
    localPosts.forEach(function(p) { localById[p.id] = true; });
    var cloudById = {};
    cloudSnap.forEach(function(doc) { cloudById[doc.id] = true; });
    var toDownload = [];
    cloudSnap.forEach(function(doc) {
      if (!localById[doc.id] && !_recentlyDeletedIds[doc.id]) toDownload.push({id: doc.id, data: doc.data()});
    });
    // Separate local-only posts into: upload (never synced) vs delete (deleted on another device)
    var toUpload = [];
    var toDeleteLocally = [];
    localPosts.forEach(function(p) {
      if (cloudById[p.id]) return; // already in cloud
      if (p.cloudSynced || p.thumbnailUrl || p.cloudImageUrls) {
        // Was synced before but no longer in cloud → deleted on another device
        toDeleteLocally.push(p);
      } else {
        // Never synced → needs uploading
        toUpload.push(p);
      }
    });
    if (!toDownload.length && !toUpload.length && !toDeleteLocally.length) return;
    var ops = [];
    toDownload.forEach(function(item) { ops.push(downloadCloudPost(item.id, item.data)); });
    toUpload.forEach(function(post) { ops.push(syncToCloud(post)); });
    toDeleteLocally.forEach(function(post) { ops.push(dbDelete(post.id)); });
    return Promise.all(ops).then(function() {
      var total = toDownload.length + toUpload.length;
      var msg = total ? '\u2713 ' + total + ' Post(s) synchronisiert' : '';
      if (toDeleteLocally.length) msg += (msg ? ', ' : '\u2713 ') + toDeleteLocally.length + ' gel\u00f6schte entfernt';
      if (msg) showToast(msg);
      if (toDeleteLocally.length) loadHistoryGrid();
    });
  }).catch(function(err) {
    console.warn('syncCloud failed:', err);
    showToast('\u26a0 Cloud-Sync fehlgeschlagen');
  });
}
// ===== FIREBASE TEMPLATE SYNC =====
function syncTemplatesToCloud(templates) {
  if (!fbUser || !fbEnabled) return;
  fbDb.collection('users').doc(fbUser.uid).collection('settings').doc('templates').set({
    data: templates
  }).catch(function(err) { console.warn('Template cloud sync failed:', err); });
}
function syncTemplatesFromCloud() {
  if (!fbUser || !fbEnabled) return;
  fbDb.collection('users').doc(fbUser.uid).collection('settings').doc('templates').get().then(function(doc) {
    if (!doc.exists) return;
    var cloudTpls = doc.data().data || {};
    var localTpls = loadTemplates();
    var merged = false;
    Object.keys(cloudTpls).forEach(function(name) {
      if (!localTpls[name]) { localTpls[name] = cloudTpls[name]; merged = true; }
    });
    Object.keys(localTpls).forEach(function(name) {
      if (!cloudTpls[name]) merged = true;
    });
    if (merged) {
      try { localStorage.setItem(TPL_KEY, JSON.stringify(localTpls)); } catch(e) {}
      syncTemplatesToCloud(localTpls);
      refreshTplSelect();
    }
  }).catch(function(err) { console.warn('Template cloud fetch failed:', err); });
}
// ===== CAROUSEL / DECK =====
let deck = [];           // array of slide state snapshots
let currentSlideIdx = 0;
let deckActive = false;
let deckThumbCache = []; // cached thumbnail canvas elements per slide index
const MAX_DECK_SLIDES = 50; // soft limit for carousel slides
let _dragSlideIdx = -1;  // index of slide being dragged
const $deckBar = document.getElementById('deckBar');
const $deckStrip = document.getElementById('deckStrip');
const $deckLabel = document.getElementById('deckLabel');
const $deckExportPdf = document.getElementById('deckExportPdf');
const $deckExportImgs = document.getElementById('deckExportImgs');
const $deckClose = document.getElementById('deckClose');
// Tool mode tabs
const $tabSingle = document.getElementById('tabSingle');
const $tabCarousel = document.getElementById('tabCarousel');
var $bCarouselExportImgs = document.getElementById('bCarouselExportImgs');
var $bCarouselExportPdf = document.getElementById('bCarouselExportPdf');
var $appDiv = document.querySelector('.app');
let currentToolMode = 'single'; // 'single' or 'carousel'

function revokeDeckBlobs() {
  for (var i = 0; i < deck.length; i++) {
    for (var j = 0; j < 2; j++) {
      if (deck[i].blobs[j]) { URL.revokeObjectURL(deck[i].blobs[j]); deck[i].blobs[j] = null; }
    }
  }
  deckThumbCache = [];
}

function setToolMode(mode, force) {
  if (mode === currentToolMode && !force) return;
  if (!force && mode === 'single' && deckActive && deck.length > 0) {
    if (!confirm('Karussell mit ' + deck.length + ' Slide' + (deck.length > 1 ? 's' : '') + ' verwerfen und zum Einzelpost wechseln?')) return;
  }
  currentToolMode = mode;
  $appDiv.classList.toggle('mode-single', mode === 'single');
  $appDiv.classList.toggle('mode-carousel', mode === 'carousel');
  $tabSingle.classList.toggle('active', mode === 'single');
  $tabCarousel.classList.toggle('active', mode === 'carousel');
  $tabSingle.setAttribute('aria-selected', String(mode === 'single'));
  $tabCarousel.setAttribute('aria-selected', String(mode === 'carousel'));
  if (mode === 'carousel') {
    if (!deckActive) startDeck();
  } else {
    if (deckActive) {
      _loadedPostId = null; // reset when discarding carousel
      revokeDeckBlobs();
      deckActive = false;
      deck = [];
      currentSlideIdx = 0;
      $deckBar.classList.remove('active');
    }
  }
  updateSaveButtonLabel();
}
$tabSingle.addEventListener('click', function() { setToolMode('single'); });
$tabCarousel.addEventListener('click', function() { setToolMode('carousel'); });
// Wire topbar carousel export buttons to deck bar equivalents
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
  autoSize($hl);
  autoSize($sub);
  renderUI();
}

function saveCurrentSlide() {
  if (!deckActive || !deck.length) return;
  // Read current editor inputs into S first
  S.hlLines = $hl.value.split('\n');
  S.subText = $sub.value;
  var iso = $date.value;
  if (iso) S.dateText = isoToDE(iso);
  deck[currentSlideIdx] = slideSnapshot();
}

function switchToSlide(idx) {
  if (idx < 0 || idx >= deck.length) return;
  saveCurrentSlide();
  // Invalidate cache for the slide we're leaving (it may have changed)
  if (deckThumbCache[currentSlideIdx]) deckThumbCache[currentSlideIdx] = null;
  currentSlideIdx = idx;
  loadSlideState(deck[idx]);
  refreshEditorFromState();
  // Draw the new slide synchronously so captureCurrentThumb() gets the right content
  _origDraw();
  renderDeckStrip();
}

function renderDeckStrip() {
  if (!deckActive) return;
  while ($deckStrip.firstChild) $deckStrip.removeChild($deckStrip.firstChild);
  // Sync current editor inputs into S and snapshot
  S.hlLines = $hl.value.split('\n');
  S.subText = $sub.value;
  var iso = $date.value;
  if (iso) S.dateText = isoToDE(iso);
  deck[currentSlideIdx] = slideSnapshot();

  var thumbW = 120;
  var thumbH = Math.round(thumbW * (H / W)) || 90;
  // Container matches the canvas aspect ratio so CSS stretch looks correct
  // (object-fit does NOT work on <canvas> elements)
  var containerW = 72;
  var containerH = Math.round(containerW * (H / W));

  // Ensure thumb cache array matches deck length
  while (deckThumbCache.length < deck.length) deckThumbCache.push(null);
  if (deckThumbCache.length > deck.length) deckThumbCache.length = deck.length;

  // Always refresh current slide thumbnail from live canvas
  _origDraw();
  var curCache = document.createElement('canvas');
  curCache.width = thumbW; curCache.height = thumbH;
  curCache.getContext('2d').drawImage(cv, 0, 0, thumbW, thumbH);
  deckThumbCache[currentSlideIdx] = curCache;

  for (var i = 0; i < deck.length; i++) {
    var div = document.createElement('div');
    div.className = 'deck-slide' + (i === currentSlideIdx ? ' current' : '');
    div.setAttribute('data-idx', i);
    div.style.height = containerH + 'px';

    if (!deckThumbCache[i]) {
      // No cache: render slide, capture, restore (only happens once per slide)
      loadSlideState(deck[i]);
      _origDraw();
      var cc = document.createElement('canvas');
      cc.width = thumbW; cc.height = thumbH;
      cc.getContext('2d').drawImage(cv, 0, 0, thumbW, thumbH);
      deckThumbCache[i] = cc;
      loadSlideState(deck[currentSlideIdx]);
      _origDraw();
    }
    // Clone cached canvas for display (cache stays offscreen for reuse)
    var tc = document.createElement('canvas');
    tc.width = thumbW; tc.height = thumbH;
    tc.getContext('2d').drawImage(deckThumbCache[i], 0, 0);
    tc.className = 'deck-thumb-canvas';
    div.appendChild(tc);

    var num = document.createElement('span');
    num.className = 'slide-num';
    num.textContent = (i + 1);
    div.appendChild(num);

    if (deck.length > 1) {
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
        // Transparent drag image — we use CSS for visual feedback
        try { e.dataTransfer.setData('text/plain', '' + idx); } catch (ex) {}
        setTimeout(function() { div.style.opacity = '0.4'; }, 0);
      };
    })(i));
    div.addEventListener('dragend', function() {
      this.style.opacity = '';
      _dragSlideIdx = -1;
      // Remove all drop indicators
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
        // Visual indicator: show insertion point
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

  // Add button (matches dynamic height)
  var addBtn = document.createElement('button');
  addBtn.className = 'deck-add';
  addBtn.style.height = containerH + 'px';
  addBtn.textContent = '+';
  addBtn.title = 'Slide hinzufügen';
  if (deck.length >= MAX_DECK_SLIDES) {
    addBtn.disabled = true;
    addBtn.title = 'Maximale Slide-Anzahl erreicht (' + MAX_DECK_SLIDES + ')';
  }
  addBtn.addEventListener('click', addSlide);
  $deckStrip.appendChild(addBtn);

  $deckLabel.textContent = 'Slide ' + (currentSlideIdx + 1) + ' / ' + deck.length;

  // Scroll current into view
  var currentEl = $deckStrip.querySelector('.current');
  if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// Touch-based drag & drop for mobile (HTML5 drag events don't fire on touch)
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
    // Highlight drop target
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
      // Find drop target
      var cx = e.changedTouches[0].clientX;
      var allSlides = $deckStrip.querySelectorAll('.deck-slide');
      for (var j = 0; j < allSlides.length; j++) {
        allSlides[j].classList.remove('drag-over-left', 'drag-over-right');
        var rect = allSlides[j].getBoundingClientRect();
        if (cx >= rect.left && cx <= rect.right) {
          var targetIdx = +allSlides[j].getAttribute('data-idx');
          var midX = rect.left + rect.width / 2;
          var insertIdx = cx < midX ? targetIdx : targetIdx + 1;
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
  if (deck.length >= MAX_DECK_SLIDES) {
    showToast('\u26a0 Maximale Slide-Anzahl erreicht (' + MAX_DECK_SLIDES + ')');
    return;
  }
  saveCurrentSlide();
  // New blank slide inherits format but blank content
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
  deck.push(newSlide);
  switchToSlide(deck.length - 1);
  saveDraft();
}

function removeSlide(idx) {
  if (deck.length <= 1) return;
  if (!confirm('Slide ' + (idx + 1) + ' unwiderruflich l\u00f6schen?')) return;
  var removed = deck[idx];
  if (removed) {
    // Only revoke blob URLs that aren't referenced by other slides
    for (var ri = 0; ri < 2; ri++) {
      if (removed.blobs[ri]) {
        var urlInUse = false;
        for (var oi = 0; oi < deck.length; oi++) {
          if (oi !== idx && deck[oi].blobs[ri] === removed.blobs[ri]) { urlInUse = true; break; }
        }
        if (!urlInUse) URL.revokeObjectURL(removed.blobs[ri]);
      }
    }
  }
  deck.splice(idx, 1);
  deckThumbCache.splice(idx, 1);
  if (currentSlideIdx >= deck.length) currentSlideIdx = deck.length - 1;
  else if (idx < currentSlideIdx) currentSlideIdx--;
  loadSlideState(deck[currentSlideIdx]);
  refreshEditorFromState();
  _origDraw();
  renderDeckStrip();
  saveDraft();
}

function moveSlide(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= deck.length || toIdx >= deck.length) return;
  saveCurrentSlide();
  var slide = deck.splice(fromIdx, 1)[0];
  var thumb = deckThumbCache.splice(fromIdx, 1)[0];
  deck.splice(toIdx, 0, slide);
  deckThumbCache.splice(toIdx, 0, thumb);
  // Update currentSlideIdx to follow the moved slide if needed
  if (currentSlideIdx === fromIdx) {
    currentSlideIdx = toIdx;
  } else if (fromIdx < currentSlideIdx && toIdx >= currentSlideIdx) {
    currentSlideIdx--;
  } else if (fromIdx > currentSlideIdx && toIdx <= currentSlideIdx) {
    currentSlideIdx++;
  }
  loadSlideState(deck[currentSlideIdx]);
  refreshEditorFromState();
  _origDraw();
  renderDeckStrip();
}

function startDeck() {
  if (deckActive) return;
  deckActive = true;
  _loadedPostId = null;
  deck = [slideSnapshot()];
  deckThumbCache = [null];
  currentSlideIdx = 0;
  $deckBar.classList.add('active');
  updateSaveButtonLabel();
  _origDraw();
  renderDeckStrip();
  showToast('Karussell-Modus aktiv \u2013 Slides hinzuf\u00fcgen mit +');
}

function stopDeck() {
  if (!deckActive) return;
  // setToolMode('single', true) will reset deckActive, deck, etc.
  setToolMode('single', true);
  showToast('Karussell-Modus beendet');
}

$deckClose.addEventListener('click', function() {
  if (deck.length > 0 && !confirm('Karussell beenden?' + (deck.length > 1 ? ' Alle Slides au\u00dfer dem aktuellen gehen verloren.' : ''))) return;
  stopDeck();
});

// PDF Export
$deckExportPdf.addEventListener('click', function() {
  if (!deckActive || !deck.length) return;
  saveCurrentSlide();
  var btn = $deckExportPdf;
  btn.disabled = true;
  btn.textContent = 'Exportiert…';

  // Lock canvas to prevent scheduleDraw() from overwriting during export
  _exportLock = true;
  function doExport() {
    try {
      var origSnap = slideSnapshot();
      // Use first slide's format to determine PDF page size
      loadSlideState(deck[0]);
      setFormat(deck[0].format || S.format);
      var orient = W > H ? 'landscape' : 'portrait';
      var pdfW = W, pdfH = H;
      var pdf = new window.jspdf.jsPDF({
        orientation: orient,
        unit: 'px',
        format: [pdfW, pdfH],
        hotfixes: ['px_scaling']
      });

      var failedSlides = [];
      for (var i = 0; i < deck.length; i++) {
        if (i > 0) pdf.addPage([pdfW, pdfH], orient);
        loadSlideState(deck[i]);
        // Ensure canvas matches the slide format
        setFormat(deck[i].format || S.format);
        _origDraw();
        try {
          var imgData = cv.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        } catch (taintErr) {
          failedSlides.push(i + 1);
          // Canvas tainted — draw placeholder
          pdf.setFillColor(26, 26, 62);
          pdf.rect(0, 0, pdfW, pdfH, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(24);
          pdf.text('Slide ' + (i + 1) + ' \u2013 Export nicht m\u00f6glich (CORS)', pdfW / 2, pdfH / 2, { align: 'center' });
        }
      }

      // Restore current slide
      loadSlideState(origSnap);
      setFormat(origSnap.format || S.format);
      _origDraw();

      if (failedSlides.length > 0) {
        showToast('\u26a0 Slides ' + failedSlides.join(', ') + ' konnten nicht exportiert werden (CORS)');
      }

      pdf.save('ki-news-karussell-' + new Date().toISOString().slice(0, 10) + '.pdf');
      btn.classList.add('btn-success');
      showToast('\u2713 PDF mit ' + deck.length + ' Slides exportiert');
      setTimeout(function() { btn.classList.remove('btn-success'); }, 1500);
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('\u26a0 PDF-Export fehlgeschlagen: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = 'PDF Export';
    _exportLock = false;
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
      showToast('\u26a0 jsPDF konnte nicht geladen werden');
    };
    document.head.appendChild(script);
  }
});

// Batch image export (individual PNG/JPG files for Instagram)
$deckExportImgs.addEventListener('click', function() {
  if (!deckActive || !deck.length) return;
  saveCurrentSlide();
  var btn = $deckExportImgs;
  btn.disabled = true;
  btn.textContent = 'Exportiert\u2026';
  var isJpg = saveFmt === 'jpg';
  var mime = isJpg ? 'image/jpeg' : 'image/png';
  var ext = isJpg ? '.jpg' : '.png';
  _exportLock = true;
  var origSnap = slideSnapshot();
  var ts = new Date().toISOString().slice(0, 10);
  var exported = 0;

  function exportSlide(i) {
    if (i >= deck.length) {
      // Done — restore state
      loadSlideState(origSnap);
      setFormat(origSnap.format || S.format);
      _origDraw();
      _exportLock = false;
      btn.disabled = false;
      btn.textContent = 'Bilder Export';
      btn.classList.add('btn-success');
      showToast('\u2713 ' + deck.length + ' Slides als ' + (isJpg ? 'JPG' : 'PNG') + ' exportiert');
      setTimeout(function() { btn.classList.remove('btn-success'); }, 1500);
      return;
    }
    loadSlideState(deck[i]);
    setFormat(deck[i].format || S.format);
    _origDraw();
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
        // Small delay between downloads so browser doesn't block them
        setTimeout(function() { exportSlide(i + 1); }, 300);
      }, mime];
      if (isJpg) args.push(0.95);
      cv.toBlob.apply(cv, args);
    } catch (taintErr) {
      console.warn('Slide ' + (i + 1) + ' export failed (tainted canvas):', taintErr);
      showToast('\u26a0 Slide ' + (i + 1) + ' konnte nicht exportiert werden');
      setTimeout(function() { exportSlide(i + 1); }, 100);
    }
  }
  exportSlide(0);
});

// Hook into draw to update current slide thumbnail (debounced)
let deckThumbTimer = null;
function scheduleDeckThumbUpdate() {
  if (!deckActive) return;
  clearTimeout(deckThumbTimer);
  deckThumbTimer = setTimeout(function() {
    if (!deckActive) return;
    // Update the current slide's canvas thumbnail in-place (redraw from main canvas)
    var thumbCanvas = $deckStrip.querySelector('.deck-slide.current .deck-thumb-canvas');
    if (thumbCanvas) {
      thumbCanvas.getContext('2d').drawImage(cv, 0, 0, thumbCanvas.width, thumbCanvas.height);
      // Also update the cache canvas
      if (deckThumbCache[currentSlideIdx]) {
        deckThumbCache[currentSlideIdx].getContext('2d').drawImage(cv, 0, 0, deckThumbCache[currentSlideIdx].width, deckThumbCache[currentSlideIdx].height);
      }
    }
  }, 250);
}

// Patch scheduleDraw to also update deck thumbs
const _origDraw = draw;
draw = function() {
  _origDraw();
  if (showSafeZone) {
    var szH = Math.round(H * SAFE_ZONE_RATIO);
    var szY = H - szH;
    // Semi-transparent overlay
    cx.fillStyle = 'rgba(255, 60, 60, 0.13)';
    cx.fillRect(0, szY, W, szH);
    // Dashed line at safe zone boundary
    cx.save();
    cx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    cx.lineWidth = 2;
    cx.setLineDash([12, 6]);
    cx.beginPath();
    cx.moveTo(0, szY);
    cx.lineTo(W, szY);
    cx.stroke();
    // Label
    cx.setLineDash([]);
    cx.font = '500 22px ' + SYS_FONT;
    cx.fillStyle = 'rgba(255, 80, 80, 0.7)';
    cx.textAlign = 'left';
    cx.textBaseline = 'top';
    cx.fillText('LinkedIn Safe Zone', MX, szY + 6);
    cx.restore();
  }
  scheduleDeckThumbUpdate();
};

// ===== INIT =====
function init() {
  if (document.fonts && !document.fonts.check('12px Festivo')) {
    showToast('\u26a0 Font l\u00e4dt\u2026');
  }
  refreshEditorFromState();
  refreshTplSelect();
  lastSnap = stateSnapshot();
  // Editor panel always visible
  $EP.style.display = 'block';
  autoSize($hl);
  autoSize($sub);
  draw();
  // Don't restore draft – always start fresh.
  // Delete any leftover draft from a previous session.
  deleteDraft();
  // Onboarding for first-time users
  if (!localStorage.getItem('ki-onboarded')) {
    var ob = document.createElement('div');
    ob.className = 'onboarding-hint';
    ob.innerHTML = '';
    ob.textContent = '';
    var msg = document.createElement('span');
    msg.textContent = 'Willkommen! Lade ein Bild hoch, schreibe eine Headline und exportiere deinen Post.';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Hinweis schlie\u00dfen');
    closeBtn.addEventListener('click', function() {
      ob.remove();
      try { localStorage.setItem('ki-onboarded', '1'); } catch(e) {}
    });
    ob.appendChild(msg);
    ob.appendChild(closeBtn);
    document.querySelector('.ed-panel').prepend(ob);
    setTimeout(function() {
      ob.remove();
      try { localStorage.setItem('ki-onboarded', '1'); } catch(e) {}
    }, 15000);
  }
}
let initialized = false;
let fontReady = false;
function safeInit(fontOk) {
  if (initialized) return;
  initialized = true;
  fontReady = fontOk;
  if (!fontOk) showToast('\u26a0 Font nicht verf\u00fcgbar \u2013 Fallback aktiv');
  init();
}
if (document.fonts && document.fonts.load) {
  document.fonts.load('bold 48px Festivo').then(function() {
    fontReady = true;
    safeInit(true);
  }).catch(function() {
    safeInit(false);
  });
  setTimeout(function() { safeInit(false); }, 3000);
  // Font may load after timeout — update flag and redraw
  if (document.fonts.ready) {
    document.fonts.ready.then(function() {
      if (document.fonts.check('bold 48px Festivo')) {
        fontReady = true;
        scheduleDraw();
      }
    });
  }
} else {
  window.addEventListener('load', function() { safeInit(true); });
}
window.addEventListener('resize', function() {
  scheduleDraw();
});
// ===== BEFOREUNLOAD: UNSAVED CHANGES WARNING =====
let _savedSnap = stateSnapshot();
function markSaved() { _savedSnap = stateSnapshot(); }
window.addEventListener('beforeunload', function(e) {
  var current = stateSnapshot();
  if (!snapshotsEqual(current, _savedSnap)) {
    e.preventDefault();
    e.returnValue = '';
  }
});
})();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function(e) { console.warn('SW registration failed:', e); });
}
