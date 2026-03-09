import { app, G, S, cv, defaultCrop, todayDE, setSaveLabel, $bA, $bSaveCopy, $bH, $histOverlay, $histDrawer, $histClose, $histBody, $histEmpty, $histGrid, $histFilterAll, $histFilterSingle, $histFilterCarousel, $f, $hl, $sub } from './state.js';
import { buildSlideData, loadSlideFromSaved } from './utils.js';
function compressSlideImages(snap) {
  var promises = [];
  for (var i = 0; i < 2; i++) {
    if (snap.imgs[i]) { promises.push(app.compressImage(snap.imgs[i])); }
    else { promises.push(Promise.resolve(null)); }
  }
  return Promise.all(promises);
}

function updateSaveButtonLabel() {
  var isCarousel = G.deckActive;
  if (G._loadedPostId) {
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
  G._loadedPostId = null;
  $bA.click();
});

$bA.addEventListener('click', function() {
  var btn = this;
  if (btn.disabled) return;
  var hasContent = false;
  if (G.deckActive && G.deck.length >= 1) {
    app.saveCurrentSlide();
    for (var ci = 0; ci < G.deck.length; ci++) {
      var ds = G.deck[ci];
      if ((ds.hlLines.join('').trim()) || ds.subText.trim() || ds.imgs[0] || ds.imgs[1]) {
        hasContent = true; break;
      }
    }
  } else {
    hasContent = S.hlLines.join('').trim() || S.subText.trim() || S.imgs[0] || S.imgs[1];
  }
  if (!hasContent) { app.showToast('\u26a0 Nichts zum Speichern'); return; }
  btn.disabled = true; setSaveLabel('Speichert\u2026');
  app.showLoading();

  if (G.deckActive && G.deck.length >= 1) {
    var slidePromises = [];
    for (var si = 0; si < G.deck.length; si++) {
      slidePromises.push(compressSlideImages(G.deck[si]));
    }
    var origSnap = app.slideSnapshot();
    app.loadSlideState(G.deck[0]);
    app.baseDraw();
    var thumbPromise = app.canvasToThumbnail(cv);
    app.loadSlideState(origSnap);
    app.baseDraw();

    Promise.all([Promise.all(slidePromises), thumbPromise]).then(function(allResults) {
      var allSlideImages = allResults[0];
      var thumbnail = allResults[1];
      var slides = [];
      for (var j = 0; j < G.deck.length; j++) {
        var sd = buildSlideData(G.deck[j]);
        sd.images = [allSlideImages[j][0], allSlideImages[j][1]];
        slides.push(sd);
      }
      var postId = G._loadedPostId || app.generatePostId();
      var post = {
        id: postId, savedAt: new Date().toISOString(),
        headline: slides[0].headline, subtitle: slides[0].subtitle, date: slides[0].date,
        layout: slides[0].layout, format: S.format,
        hlCaps: slides[0].hlCaps, subCaps: slides[0].subCaps,
        hlFSOverride: slides[0].hlFSOverride, subFSOverride: slides[0].subFSOverride, credFSOverride: slides[0].credFSOverride,
        credAlign: slides[0].credAlign, credOffX: slides[0].credOffX, credOffY: slides[0].credOffY,
        credShadow: slides[0].credShadow, textPos: slides[0].textPos,
        credits: slides[0].credits, crops: slides[0].crops,
        thumbnail: thumbnail, images: slides[0].images,
        isCarousel: true, slides: slides
      };
      return app.dbAdd(post).then(function() { return post; });
    }).then(function(post) {
      var wasOverwrite = !!G._loadedPostId;
      app.syncToCloud(post);
      G._loadedPostId = post.id;
      setSaveLabel('\u2713 Gespeichert!');
      btn.classList.add('btn-success');
      app.markSaved();
      app.showToast('\u2713 Karussell mit ' + post.slides.length + ' Slides ' + (wasOverwrite ? '\u00fcberschrieben' : 'gespeichert'));
      setTimeout(function() {
        btn.disabled = false; updateSaveButtonLabel(); btn.classList.remove('btn-success');
      }, 1500);
    }).catch(function(err) {
      console.warn('Carousel save failed:', err);
      btn.disabled = false; updateSaveButtonLabel();
      app.showToast('\u26a0 Speichern fehlgeschlagen');
    }).finally(function() { app.hideLoading(); });
    return;
  }

  // Single-slide save
  app.draw();
  var promises = [];
  for (var i = 0; i < 2; i++) {
    if (S.imgs[i]) { promises.push(app.compressImage(S.imgs[i])); }
    else { promises.push(Promise.resolve(null)); }
  }
  promises.push(app.canvasToThumbnail(cv));
  Promise.all(promises).then(function(results) {
    var postId = G._loadedPostId || app.generatePostId();
    var post = {
      id: postId, savedAt: new Date().toISOString(),
      headline: S.hlLines.join('\n'), subtitle: S.subText, date: S.dateText,
      layout: S.layout, format: S.format,
      hlCaps: S.hlCaps, subCaps: S.subCaps,
      hlFSOverride: S.hlFSOverride, subFSOverride: S.subFSOverride, credFSOverride: S.credFSOverride,
      credAlign: S.credAlign, credOffX: S.credOffX, credOffY: S.credOffY,
      credShadow: S.credShadow, textPos: S.textPos,
      credits: S.creds.slice(),
      crops: S.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; }),
      thumbnail: results[2], images: [results[0], results[1]]
    };
    return app.dbAdd(post).then(function() { return post; });
  }).then(function(post) {
    var wasOverwrite = !!G._loadedPostId;
    app.syncToCloud(post);
    G._loadedPostId = post.id;
    setSaveLabel('\u2713 Gespeichert!');
    btn.classList.add('btn-success');
    app.markSaved();
    app.showToast('\u2713 Post ' + (wasOverwrite ? '\u00fcberschrieben' : 'gespeichert'));
    setTimeout(function() {
      btn.disabled = false; updateSaveButtonLabel(); btn.classList.remove('btn-success');
    }, 1500);
  }).catch(function(err) {
    console.warn('Save failed:', err);
    btn.disabled = false; updateSaveButtonLabel();
    app.showToast('\u26a0 Speichern fehlgeschlagen');
  }).finally(function() { app.hideLoading(); });
});

// ===== HISTORY: DRAWER =====
var _drawerEscHandler = null;
var _drawerTrapHandler = null;
function openHistory() {
  $histOverlay.classList.add('open');
  $histDrawer.classList.add('open');
  loadHistoryGrid();
  $histClose.focus();
  _drawerEscHandler = function(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeHistory(); }
  };
  document.addEventListener('keydown', _drawerEscHandler);
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
var activeThumbUrls = [];
var _histPosts = [];
var histFilter = 'all';

$histGrid.addEventListener('click', function(e) {
  var delBtn = e.target.closest('.hist-del');
  if (delBtn) {
    e.stopPropagation();
    var idx = +delBtn.getAttribute('data-idx');
    var post = _histPosts[idx];
    if (!post || !confirm('Gespeicherten Post l\u00f6schen?')) return;
    G._recentlyDeletedIds[post.id] = true;
    var slideCount = post.isCarousel && post.slides ? post.slides.length : 1;
    Promise.all([
      app.dbDelete(post.id),
      app.deleteFromCloud(post.id, slideCount)
    ]).then(function() {
      delete G._recentlyDeletedIds[post.id];
      loadHistoryGrid();
      app.showToast('\u2713 Post gel\u00f6scht');
    }).catch(function() {
      delete G._recentlyDeletedIds[post.id];
      loadHistoryGrid();
      app.showToast('\u2713 Post lokal gel\u00f6scht');
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
  activeThumbUrls.forEach(function(u) { URL.revokeObjectURL(u); });
  activeThumbUrls = [];
  app.dbGetAll().then(function(allPosts) {
    var posts = allPosts;
    if (histFilter === 'single') posts = allPosts.filter(function(p) { return !p.isCarousel; });
    else if (histFilter === 'carousel') posts = allPosts.filter(function(p) { return !!p.isCarousel; });
    _histPosts = posts;
    while ($histGrid.firstChild) $histGrid.removeChild($histGrid.firstChild);
    $histEmpty.textContent = posts.length ? '' : (histFilter === 'all' ? 'Noch keine Posts gespeichert.' : 'Keine ' + (histFilter === 'carousel' ? 'Karussells' : 'Einzelposts') + ' gespeichert.');
    $histEmpty.style.display = posts.length ? 'none' : 'block';
    var countEl = document.getElementById('histCount');
    if (countEl) countEl.textContent = allPosts.length ? allPosts.length + ' / ' + app.MAX_ARCHIVE_POSTS + ' Posts' : '';
    posts.forEach(function(post, pi) {
      var item = document.createElement('div');
      item.className = 'hist-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('data-idx', pi);
      item.setAttribute('aria-label', 'Post laden: ' + (post.headline || 'Ohne Titel'));
      var img = document.createElement('img');
      img.style.background = 'linear-gradient(180deg, #1a1a3e 0%, #0a0a1a 100%)';
      if (post.thumbnail) {
        var thumbUrl = URL.createObjectURL(post.thumbnail);
        activeThumbUrls.push(thumbUrl);
        img.src = thumbUrl;
      } else if (post.thumbnailUrl) {
        img.src = post.thumbnailUrl;
      }
      img.alt = post.headline || 'Post';
      item.appendChild(img);
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
  if (G.deckActive && G.deck.length > 1) {
    confirmMsg = 'Aktuelles Karussell (' + G.deck.length + ' Slides) ersetzen und gespeicherten Post laden?';
  }
  if (hasContent && !confirm(confirmMsg)) return;
  app.setToolMode('single', true);
  app.revokeBlob(0); app.revokeBlob(1);
  S.imgs = [null, null]; S.blobs = [null, null]; S.draftBlobs = [null, null];
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
  app.refreshEditorFromState();
  $f[0].value = ''; $f[1].value = '';
  var loaded = 0, total = 0;
  function onAllLoaded() {
    app.autoSize($hl);
    app.autoSize($sub);
    app.renderUI(); app.saveState();
    closeHistory();
    if (post.id && post.id !== '__draft__') {
      G._loadedPostId = post.id;
    }
    updateSaveButtonLabel();
    if (post.isCarousel && Array.isArray(post.slides) && post.slides.length >= 1) {
      app.revokeBlob(0); app.revokeBlob(1);
      loadCarouselPost(post);
    } else if (post.isCarousel) {
      app.showToast('\u26a0 Karussell-Daten besch\u00e4digt \u2013 als Einzelpost geladen');
    } else {
      app.showToast('\u2713 Post geladen');
    }
  }
  function loadImageBlob(idx, blob) {
    S.draftBlobs[idx] = blob;
    var blobUrl = URL.createObjectURL(blob);
    var im = new Image();
    im.onload = function() {
      S.imgs[idx] = im; S.blobs[idx] = blobUrl;
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
        app.loadCloudImage(url).then(function(r) {
          if (r.img) S.imgs[idx] = r.img;
          if (r.blob) {
            S.draftBlobs[idx] = r.blob;
            S.blobs[idx] = URL.createObjectURL(r.blob);
            if (!post.images) post.images = [null, null];
            post.images[idx] = r.blob;
            app.dbAdd(post).catch(function() {});
          }
          loaded++;
          if (loaded >= total) onAllLoaded();
        });
      })(i, post.cloudImageUrls[0][i]);
    }
  }
  if (total === 0) onAllLoaded();
}

function loadCarouselPost(post) {
  if (G.deckActive) { app.revokeDeckBlobs(); G.deckActive = false; G.deck = []; }
  var slides = post.slides;
  G.deck = [];
  var totalImgs = 0, loadedImgs = 0;
  for (var si = 0; si < slides.length; si++) {
    G.deck.push(loadSlideFromSaved(slides[si]));
  }
  for (var si2 = 0; si2 < slides.length; si2++) {
    for (var ii = 0; ii < 2; ii++) {
      var hasBlob2 = slides[si2].images && slides[si2].images[ii];
      var hasCloudUrl2 = !hasBlob2 && post.cloudImageUrls && post.cloudImageUrls[si2] && post.cloudImageUrls[si2][ii];
      if (hasBlob2 || hasCloudUrl2) totalImgs++;
    }
  }
  function onAllCarouselImgsLoaded() {
    G.deckActive = true;
    G.deckThumbCache = G.deck.map(function() { return null; });
    G.currentSlideIdx = 0;
    app.loadSlideState(G.deck[0]);
    app.refreshEditorFromState();
    var $deckBar = document.getElementById('deckBar');
    $deckBar.classList.add('active');
    G.currentToolMode = 'carousel';
    var $appDiv = document.querySelector('.app');
    $appDiv.classList.remove('mode-single');
    $appDiv.classList.add('mode-carousel');
    var $tabSingle = document.getElementById('tabSingle');
    var $tabCarousel = document.getElementById('tabCarousel');
    $tabSingle.classList.remove('active');
    $tabCarousel.classList.add('active');
    $tabSingle.setAttribute('aria-selected', 'false');
    $tabCarousel.setAttribute('aria-selected', 'true');
    updateSaveButtonLabel();
    app.baseDraw();
    app.renderDeckStrip();
    app.showToast('\u2713 Karussell mit ' + G.deck.length + ' Slides geladen');
  }
  if (totalImgs === 0) { onAllCarouselImgsLoaded(); return; }
  function loadCarouselImageBlob(slideIdx, imgIdx, blob) {
    G.deck[slideIdx].draftBlobs[imgIdx] = blob;
    var blobUrl = URL.createObjectURL(blob);
    var im = new Image();
    im.onload = function() {
      G.deck[slideIdx].imgs[imgIdx] = im;
      G.deck[slideIdx].blobs[imgIdx] = blobUrl;
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
          app.loadCloudImage(url).then(function(r) {
            if (r.img) G.deck[sIdx].imgs[iIdx] = r.img;
            if (r.blob) {
              G.deck[sIdx].draftBlobs[iIdx] = r.blob;
              G.deck[sIdx].blobs[iIdx] = URL.createObjectURL(r.blob);
              if (!slides[sIdx].images) slides[sIdx].images = [null, null];
              slides[sIdx].images[iIdx] = r.blob;
              app.dbAdd(post).catch(function() {});
            }
            loadedImgs++;
            if (loadedImgs >= totalImgs) onAllCarouselImgsLoaded();
          });
        })(si3, ii2, post.cloudImageUrls[si3][ii2]);
      }
    }
  }
}

// ===== REGISTER ON APP =====
app.loadHistoryGrid = loadHistoryGrid;
app.loadArchivedPost = loadArchivedPost;
app.loadCarouselPost = loadCarouselPost;
app.openHistory = openHistory;
app.closeHistory = closeHistory;
app.updateSaveButtonLabel = updateSaveButtonLabel;
