import { app, G, S, $toast, $loadingOverlay, $bC, $bS, $hl, $sub, $hlCount, $subCount, $themeToggle, $toolbarMoreBtn, $designToggle, $designMenu } from './state.js';

// ===== COLLAPSIBLE SECTIONS =====
(function initCollapsible() {
  var STORE_KEY = 'ki-collapsed';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) {}
  document.querySelectorAll('.ed.collapsible').forEach(function(ed) {
    var id = ed.id;
    var toggle = ed.querySelector('.ed-toggle');
    if (!toggle) return;
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
    document.querySelectorAll('.ed-toggle').forEach(function(t) {
      t.addEventListener('click', function() { setTimeout(updateColBtn, 0); });
    });
  }
})();

// ===== SHOW COPY/SHARE IF SUPPORTED =====
if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
  $bC.style.display = '';
}
if (navigator.canShare && navigator.canShare({ files: [new File([''], 't.jpg', { type: 'image/jpeg' })] })) {
  $bS.style.display = '';
}

// ===== MOBILE OVERFLOW MENU =====
var _overflowPanel = null;
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
  var btnRow = document.querySelector('.btn-row');
  var groups = btnRow.querySelectorAll(':scope > .toolbar-share, :scope > .toolbar-save, :scope > .toolbar-util');
  _overflowPanel._sourceGroups = [];
  groups.forEach(function(g) {
    _overflowPanel._sourceGroups.push({el: g, next: g.nextSibling, parent: g.parentNode});
    _overflowPanel.appendChild(g);
  });
  _overflowPanel.classList.add('open');
  $toolbarMoreBtn.setAttribute('aria-expanded', 'true');
  setTimeout(function() {
    document.addEventListener('click', _overflowOutsideClick);
  }, 0);
}
function closeToolbarOverflow() {
  if (!_overflowPanel) return;
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
document.addEventListener('click', function(e) {
  if (_overflowPanel && _overflowPanel.classList.contains('open') && e.target.closest('.toolbar-overflow-panel button:not(.theme-switcher-btn)')) {
    setTimeout(closeToolbarOverflow, 100);
  }
});

// ===== TOAST =====
var toastTimer = null;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { $toast.classList.remove('show'); }, 2000);
}

// ===== LOADING OVERLAY =====
var _loadingCount = 0;
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

var CHAR_LIMITS = { hl: [60, 70], sub: [70, 80] };

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

// ===== DARK MODE TOGGLE =====
var THEME_KEY = 'ki-news-theme';
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
var DESIGN_KEY = 'ki-news-design-theme';
var lgIsFirefox = typeof InstallTrigger !== 'undefined' || navigator.userAgent.indexOf('Firefox') > -1;
var DESIGN_ICONS = { 'default': '\u25c7', 'fluent': '\u25a8', 'liquid-glass': '\u2666', 'm3x': '\u2726', 'geist': '\u25b3' };
var DESIGN_LABELS = { 'default': 'Standard', 'fluent': 'Fluent 2', 'liquid-glass': 'Liquid Glass', 'm3x': 'Material 3', 'geist': 'Geist' };
var currentDesign = 'default';
function applyDesignTheme(theme) {
  var html = document.documentElement;
  html.classList.add('lg-transitioning');
  Object.keys(DESIGN_LABELS).forEach(function(k) { if (k !== 'default') html.classList.remove(k); });
  html.classList.remove('lg-no-blur');
  currentDesign = theme;
  if (theme !== 'default') html.classList.add(theme);
  if (theme === 'liquid-glass' && lgIsFirefox) html.classList.add('lg-no-blur');
  $designToggle.textContent = DESIGN_ICONS[theme] || '\u25c7';
  $designToggle.title = 'Design: ' + (DESIGN_LABELS[theme] || 'Standard');
  var opts = $designMenu.querySelectorAll('.theme-switcher-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].getAttribute('data-design') === theme);
  }
  try { localStorage.setItem(DESIGN_KEY, theme); } catch(e) {}
  try { localStorage.removeItem('ki-news-liquid-glass'); } catch(e) {}
  setTimeout(function() { html.classList.remove('lg-transitioning'); }, 500);
}
(function() {
  var saved = '';
  try { saved = localStorage.getItem(DESIGN_KEY) || ''; } catch(e) {}
  if (!saved) {
    try {
      var oldLG = localStorage.getItem('ki-news-liquid-glass');
      if (oldLG === '1') saved = 'liquid-glass';
    } catch(e) {}
  }
  if (saved && saved !== 'default') applyDesignTheme(saved);
  else $designToggle.textContent = '\u25c7';
})();
$designToggle.addEventListener('click', function(e) {
  e.stopPropagation();
  $designMenu.classList.toggle('show');
});
$designMenu.addEventListener('click', function(e) {
  var opt = e.target.closest('.theme-switcher-opt');
  if (!opt) return;
  var theme = opt.getAttribute('data-design');
  applyDesignTheme(theme);
  $designMenu.classList.remove('show');
  showToast(DESIGN_LABELS[theme] + ' aktiviert');
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('.theme-switcher')) {
    $designMenu.classList.remove('show');
  }
});

// ===== REGISTER ON APP =====
app.showToast = showToast;
app.showLoading = showLoading;
app.hideLoading = hideLoading;
app.autoSize = autoSize;
app.refreshCounts = refreshCounts;
app.revokeBlob = revokeBlob;
app.updateCharCount = updateCharCount;
app.CHAR_LIMITS = CHAR_LIMITS;
