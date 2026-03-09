import { app, G, S } from './state.js';

// ===== FIREBASE CLOUD SYNC =====
var fbEnabled = typeof firebase !== 'undefined';
var fbAuth, fbDb, fbStorage;

if (fbEnabled) {
  firebase.initializeApp({
    apiKey: "AIzaSyBuE_T6Uxvwnm4nCNHrRfdWb27zmjboUPk",
    authDomain: "ki-news-post-builder.firebaseapp.com",
    projectId: "ki-news-post-builder",
    storageBucket: "ki-news-post-builder.firebasestorage.app",
    messagingSenderId: "826867698843",
    appId: "1:826867698843:web:df93b3539e9ff959030a3e"
  });
  fbAuth = firebase.auth();
  fbDb = firebase.firestore();
  fbStorage = firebase.storage();
  var $loginBtn = document.getElementById('loginBtn');
  var $userInfo = document.getElementById('userInfo');
  var $userAvatar = document.getElementById('userAvatar');
  var $logoutBtn = document.getElementById('logoutBtn');
  fbAuth.onAuthStateChanged(function(user) {
    G.fbUser = user;
    if (user) {
      $loginBtn.style.display = 'none';
      $userInfo.style.display = 'flex';
      if (user.photoURL) $userAvatar.src = user.photoURL;
      $userAvatar.alt = user.displayName || '';
      app.showToast('\u2713 Angemeldet als ' + (user.displayName || user.email));
      syncCloud();
      syncTemplatesFromCloud();
    } else {
      $loginBtn.style.display = '';
      $userInfo.style.display = 'none';
    }
  });
  fbAuth.getRedirectResult().catch(function(err) {
    if (err.code && err.code !== 'auth/popup-closed-by-user') {
      app.showToast('\u26a0 Login: ' + (err.message || err.code));
      console.warn('Redirect login error:', err);
    }
  });
  $loginBtn.addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    $loginBtn.textContent = 'Anmelden\u2026';
    $loginBtn.disabled = true;
    fbAuth.signInWithPopup(provider).catch(function(err) {
      console.warn('Popup login error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' ||
          err.code === 'auth/operation-not-allowed' || err.code === 'auth/internal-error') {
        app.showToast('Popup blockiert \u2013 Weiterleitung\u2026');
        return fbAuth.signInWithRedirect(provider);
      }
      if (err.code === 'auth/popup-closed-by-user') {
        // no message
      } else if (err.code === 'auth/unauthorized-domain') {
        app.showToast('\u26a0 Domain nicht autorisiert \u2013 bitte in Firebase Console hinzuf\u00fcgen');
      } else {
        app.showToast('\u26a0 Login: ' + (err.message || err.code));
      }
    }).finally(function() {
      $loginBtn.textContent = 'Anmelden';
      $loginBtn.disabled = false;
    });
  });
  $logoutBtn.addEventListener('click', function() {
    fbAuth.signOut().then(function() {
      app.showToast('\u2713 Abgemeldet');
    }).catch(function(err) {
      console.warn('Sign out error:', err);
      app.showToast('\u26a0 Abmeldung fehlgeschlagen');
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
    return app.dbAdd(post);
  }).catch(function(err) {
    console.warn('syncToCloud (carousel) failed:', err);
    app.showToast('\u26a0 Cloud-Sync fehlgeschlagen');
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
    return app.dbAdd(post);
  }).catch(function(err) {
    console.warn('syncToCloud failed:', err);
    app.showToast('\u26a0 Cloud-Sync fehlgeschlagen');
  });
}

function syncToCloud(post) {
  if (!G.fbUser || !fbEnabled) return Promise.resolve();
  var uid = G.fbUser.uid;
  var basePath = 'users/' + uid + '/posts/' + post.id;
  var thumbUpload = post.thumbnail
    ? fbStorage.ref(basePath + '/thumb.jpg').put(post.thumbnail).then(function(s) { return s.ref.getDownloadURL(); })
    : Promise.resolve(null);
  if (post.isCarousel && post.slides && post.slides.length > 0) {
    return syncCarouselToCloud(post, uid, basePath, thumbUpload);
  }
  return syncSingleToCloud(post, uid, basePath, thumbUpload);
}

function deleteFromCloud(postId, slideCount) {
  if (!G.fbUser || !fbEnabled) return Promise.resolve();
  var uid = G.fbUser.uid;
  var basePath = 'users/' + uid + '/posts/' + postId;
  var deletes = [
    fbDb.collection('users').doc(uid).collection('posts').doc(postId).delete().catch(function() {}),
    fbStorage.ref(basePath + '/thumb.jpg').delete().catch(function() {}),
    fbStorage.ref(basePath + '/img0.jpg').delete().catch(function() {}),
    fbStorage.ref(basePath + '/img1.jpg').delete().catch(function() {})
  ];
  var sc = slideCount || 1;
  for (var si = 0; si < sc; si++) {
    for (var ii = 0; ii < 2; ii++) {
      deletes.push(fbStorage.ref(basePath + '/slide' + si + '_img' + ii + '.jpg').delete().catch(function() {}));
    }
  }
  return Promise.all(deletes);
}

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
      var im2 = new Image();
      im2.onload = function() { resolve({ img: im2, blob: null }); };
      im2.onerror = function() { resolve({ img: null, blob: null }); };
      im2.src = url;
    };
    im.src = url;
  });
}

function downloadCloudPost(id, data) {
  var thumbFetch = data.thumbnailUrl
    ? fetch(data.thumbnailUrl).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .catch(function() { return loadCloudImage(data.thumbnailUrl).then(function(r) { return r.blob; }); })
    : Promise.resolve(null);

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
      var slideImgMap = {};
      imgResults.forEach(function(r) { slideImgMap[r.si + '_' + r.ii] = r.blob; });
      var slides = data.slides.map(function(s, idx) {
        return {
          headline: s.headline || '', subtitle: s.subtitle || '', date: s.date || '',
          layout: s.layout || 'one', format: s.format || data.format || '4:5',
          hlCaps: !!s.hlCaps, subCaps: !!s.subCaps,
          hlFSOverride: s.hlFSOverride || 0, subFSOverride: s.subFSOverride || 0, credFSOverride: s.credFSOverride || 0,
          credAlign: s.credAlign || 'right', credOffX: s.credOffX || 0, credOffY: s.credOffY || 0,
          credShadow: !!s.credShadow, textPos: s.textPos || 'top',
          credits: s.credits || ['', ''],
          crops: s.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
          images: [slideImgMap[idx + '_0'] || null, slideImgMap[idx + '_1'] || null]
        };
      });
      return app.dbAdd({
        id: id, savedAt: data.savedAt,
        headline: data.headline || slides[0].headline, subtitle: data.subtitle || slides[0].subtitle,
        date: data.date || slides[0].date, layout: data.layout || slides[0].layout, format: data.format || '4:5',
        hlCaps: !!data.hlCaps, subCaps: !!data.subCaps,
        hlFSOverride: data.hlFSOverride || 0, subFSOverride: data.subFSOverride || 0, credFSOverride: data.credFSOverride || 0,
        credAlign: data.credAlign || 'right', credOffX: data.credOffX || 0, credOffY: data.credOffY || 0,
        credShadow: !!data.credShadow, textPos: data.textPos || 'top',
        credits: data.credits || ['', ''],
        crops: data.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
        images: slides[0].images, thumbnail: thumbnail, thumbnailUrl: data.thumbnailUrl || null,
        cloudImageUrls: data.slides.map(function(s) { return s.imageUrls || [null, null]; }),
        isCarousel: true, slides: slides, cloudSynced: true
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
    return app.dbAdd({
      id: id, savedAt: data.savedAt,
      headline: data.headline, subtitle: data.subtitle, date: data.date,
      layout: data.layout, format: data.format,
      hlCaps: data.hlCaps, subCaps: data.subCaps,
      hlFSOverride: data.hlFSOverride || 0, subFSOverride: data.subFSOverride || 0, credFSOverride: data.credFSOverride || 0,
      credAlign: data.credAlign || 'right', credOffX: data.credOffX || 0, credOffY: data.credOffY || 0,
      credShadow: !!data.credShadow, textPos: data.textPos || 'top',
      credits: data.credits || ['', ''],
      crops: data.crops || [{x:50, y:50, z:100}, {x:50, y:50, z:100}],
      images: [imgBlobs[0], imgBlobs[1]], thumbnail: thumbnail, thumbnailUrl: data.thumbnailUrl || null,
      cloudImageUrls: [data.imageUrls || [null, null]], cloudSynced: true
    });
  });
}

function syncCloud() {
  if (!G.fbUser || !fbEnabled) return;
  var uid = G.fbUser.uid;
  Promise.all([
    app.dbGetAll(),
    fbDb.collection('users').doc(uid).collection('posts').orderBy('savedAt', 'desc').get()
  ]).then(function(res) {
    var localPosts = res[0], cloudSnap = res[1];
    var localById = {};
    localPosts.forEach(function(p) { localById[p.id] = true; });
    var cloudById = {};
    cloudSnap.forEach(function(doc) { cloudById[doc.id] = true; });
    var toDownload = [];
    cloudSnap.forEach(function(doc) {
      if (!localById[doc.id] && !G._recentlyDeletedIds[doc.id]) toDownload.push({id: doc.id, data: doc.data()});
    });
    var toUpload = [];
    var toDeleteLocally = [];
    localPosts.forEach(function(p) {
      if (cloudById[p.id]) return;
      if (p.cloudSynced || p.thumbnailUrl || p.cloudImageUrls) {
        toDeleteLocally.push(p);
      } else {
        toUpload.push(p);
      }
    });
    if (!toDownload.length && !toUpload.length && !toDeleteLocally.length) return;
    var ops = [];
    toDownload.forEach(function(item) { ops.push(downloadCloudPost(item.id, item.data)); });
    toUpload.forEach(function(post) { ops.push(syncToCloud(post)); });
    toDeleteLocally.forEach(function(post) { ops.push(app.dbDelete(post.id)); });
    return Promise.all(ops).then(function() {
      var total = toDownload.length + toUpload.length;
      var msg = total ? '\u2713 ' + total + ' Post(s) synchronisiert' : '';
      if (toDeleteLocally.length) msg += (msg ? ', ' : '\u2713 ') + toDeleteLocally.length + ' gel\u00f6schte entfernt';
      if (msg) app.showToast(msg);
      if (toDeleteLocally.length) app.loadHistoryGrid();
    });
  }).catch(function(err) {
    console.warn('syncCloud failed:', err);
    app.showToast('\u26a0 Cloud-Sync fehlgeschlagen');
  });
}

// ===== FIREBASE TEMPLATE SYNC =====
var TPL_KEY = 'ki-news-templates';
function syncTemplatesToCloud(templates) {
  if (!G.fbUser || !fbEnabled) return;
  fbDb.collection('users').doc(G.fbUser.uid).collection('settings').doc('templates').set({
    data: templates
  }).catch(function(err) { console.warn('Template cloud sync failed:', err); });
}
function syncTemplatesFromCloud() {
  if (!G.fbUser || !fbEnabled) return;
  fbDb.collection('users').doc(G.fbUser.uid).collection('settings').doc('templates').get().then(function(doc) {
    if (!doc.exists) return;
    var cloudTpls = doc.data().data || {};
    var localTpls = app.loadTemplates();
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
      app.refreshTplSelect();
    }
  }).catch(function(err) { console.warn('Template cloud fetch failed:', err); });
}

// ===== REGISTER ON APP =====
app.syncToCloud = syncToCloud;
app.deleteFromCloud = deleteFromCloud;
app.loadCloudImage = loadCloudImage;
app.syncCloud = syncCloud;
app.syncTemplatesToCloud = syncTemplatesToCloud;
app.syncTemplatesFromCloud = syncTemplatesFromCloud;
