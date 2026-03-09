import './style.css';

// Module imports — order matters: state first, then modules that register on app
import { app, G, S, $hl, $sub, $EP, $saveMenu, $bSaveArrow } from './state.js';
import './ui.js';       // toast, loading, theme, collapsible sections
import './render.js';   // canvas drawing, scheduleDraw
import './storage.js';  // IndexedDB, drafts, localStorage
import './firebase.js'; // cloud sync, auth
import './history.js';  // archive save/load, history drawer
import './carousel.js'; // deck management, PDF/image export
import './editor.js';   // all input handlers, undo/redo, templates

// ===== INIT =====
function init() {
  if (document.fonts && !document.fonts.check('12px Festivo')) {
    app.showToast('\u26a0 Font l\u00e4dt\u2026');
  }
  app.refreshEditorFromState();
  app.refreshTplSelect();
  app.initLastSnap();
  $EP.style.display = 'block';
  app.autoSize($hl);
  app.autoSize($sub);
  app.draw();
  // Don't restore draft – always start fresh.
  app.deleteDraft();
  // Onboarding for first-time users
  if (!localStorage.getItem('ki-onboarded')) {
    var ob = document.createElement('div');
    ob.className = 'onboarding-hint';
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

function safeInit(fontOk) {
  if (G.initialized) return;
  G.initialized = true;
  G.fontReady = fontOk;
  if (!fontOk) app.showToast('\u26a0 Font nicht verf\u00fcgbar \u2013 Fallback aktiv');
  init();
}

if (document.fonts && document.fonts.load) {
  document.fonts.load('bold 48px Festivo').then(function() {
    G.fontReady = true;
    safeInit(true);
  }).catch(function() {
    safeInit(false);
  });
  setTimeout(function() { safeInit(false); }, 3000);
  if (document.fonts.ready) {
    document.fonts.ready.then(function() {
      if (document.fonts.check('bold 48px Festivo')) {
        G.fontReady = true;
        app.scheduleDraw();
      }
    });
  }
} else {
  window.addEventListener('load', function() { safeInit(true); });
}

window.addEventListener('resize', function() {
  app.scheduleDraw();
});

// ===== BEFOREUNLOAD: UNSAVED CHANGES WARNING =====
window.addEventListener('beforeunload', function(e) {
  if (!app.stateSnapshot || !app.snapshotsEqual || !app.getSavedSnap) return;
  var current = app.stateSnapshot();
  var saved = app.getSavedSnap();
  if (saved && !app.snapshotsEqual(current, saved)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(function(e) { console.warn('SW registration failed:', e); });
}
