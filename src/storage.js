import { app, G, S, FORMATS, defaultCrop, todayDE } from './state.js';

// ===== INDEXEDDB =====
var DB_NAME = 'ki-news-history';
var DB_VER = 1;
var DB_STORE = 'posts';
var DRAFT_ID = '__draft__';
var _dbPromise = null;
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
var MAX_ARCHIVE_POSTS = 50;
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
      app.showToast('\u26a0 Speicher voll \u2013 ' + toDelete.length + ' älteste(r) Post(s) entfernt');
      return Promise.all(toDelete.map(function(p) {
        app.deleteFromCloud(p.id, p.isCarousel && p.slides ? p.slides.length : 1);
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
var draftTimer = null;
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
    if (G.deckActive && G.deck.length > 0) {
      app.saveCurrentSlide();
      draft.isCarousel = true;
      draft.currentSlideIdx = G.currentSlideIdx;
      draft.slides = G.deck.map(function(snap) {
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
          app.loadCarouselPost(draft);
        } else if (draft) {
          app.loadArchivedPost(draft);
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
          resolve(null);
        }
      }
    }, 'image/jpeg', 0.85);
  });
}

// ===== LOCALSTORAGE =====
var LAYOUT_KEYS = { one: true, two: true, stacked: true, none: true };
var STORE_KEY = 'ki-news-state';
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      hlLines: S.hlLines, subText: S.subText, bodyText: S.bodyText, dateText: S.dateText,
      layout: S.layout, format: S.format, hlCaps: S.hlCaps, subCaps: S.subCaps,
      hlFSOverride: S.hlFSOverride, subFSOverride: S.subFSOverride, credFSOverride: S.credFSOverride,
      credAlign: S.credAlign, credOffX: S.credOffX, credOffY: S.credOffY, credShadow: S.credShadow, textPos: S.textPos,
      showPageNum: S.showPageNum
    }));
  } catch(e) { console.warn('saveState failed:', e); }
}
var saveTimer = null;
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
    if (typeof saved.bodyText === 'string') S.bodyText = saved.bodyText;
    if (typeof saved.showPageNum === 'boolean') S.showPageNum = saved.showPageNum;
  } catch(e) { console.warn('loadState failed:', e); }
}

// ===== REGISTER ON APP =====
app.dbAdd = dbAdd;
app.dbGetAll = dbGetAll;
app.dbDelete = dbDelete;
app.saveDraft = saveDraft;
app.loadDraft = loadDraft;
app.deleteDraft = deleteDraft;
app.compressImage = compressImage;
app.generatePostId = generatePostId;
app.canvasToThumbnail = canvasToThumbnail;
app.saveState = saveState;
app.debouncedSave = debouncedSave;
app.loadState = loadState;
app.MAX_ARCHIVE_POSTS = MAX_ARCHIVE_POSTS;
