import { MONTHS_DE, todayISO, isoToDE, deToISO, todayDE, defaultCrop, FORMATS } from './utils.js';

// Re-export pure utils so other modules keep their imports from state.js
export { MONTHS_DE, todayISO, isoToDE, deToISO, todayDE, defaultCrop, FORMATS };

// ===== CROSS-MODULE FUNCTION REGISTRY =====
// Modules register functions here during init. Other modules call app.fnName().
// This avoids circular imports.
export const app = {};

// ===== SHARED MUTABLE GLOBALS =====
export const G = {
  W: 1200,
  H: 1500,
  showSafeZone: false,
  saveFmt: localStorage.getItem('ki-save-fmt') || 'png',
  _loadedPostId: null,
  fontReady: false,
  initialized: false,
  _exportLock: false,
  rafPending: false,
  // Carousel shared state (accessed from editor, history, storage)
  deck: [],
  currentSlideIdx: 0,
  deckActive: false,
  deckThumbCache: [],
  currentToolMode: 'single',
  // Firebase
  fbUser: null,
  _recentlyDeletedIds: {},
};

// ===== CONSTANTS =====
export const SYS_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
export const MX = 52;
export const TOP_PAD = 55;
export const FOOTER_H = 100;
export const IMG_GAP = 16;
export const IMG_TOP_GAP = 24;
export const IMG_MIN_H = 80;
export const HL_MIN_FS = 120;
export const HL_MAX_LINES = 3;
export const SUB_MAX_LINES = 2;
export const HL_LINE_H_FACTOR = 1.08;
export const SUB_LINE_H_FACTOR = 1.15;
export const FOOTER_FS = 36;
export const FOOTER_BOTTOM = 32;
export const LOGO_H = 56;
export const SAFE_ZONE_RATIO = 0.08;

// ===== LOGO =====
export const LOGO = new Image();
LOGO.onload = function() { if (app.scheduleDraw) app.scheduleDraw(); };
LOGO.onerror = function() { console.warn('Logo konnte nicht geladen werden'); };
LOGO.src = import.meta.env.BASE_URL + "logo.png";

// ===== GRADIENT =====
export const GRADIENT_STOPS = [
  [0,    '#025671'],
  [0.50, '#261c53'],
  [1,    '#1f0e1d']
];
export const gradCV = document.createElement('canvas');
export function rebuildGradient() {
  gradCV.width = 1; gradCV.height = G.H;
  var gx = gradCV.getContext('2d');
  var grad = gx.createLinearGradient(0, 0, 0, G.H);
  for (var gi = 0; gi < GRADIENT_STOPS.length; gi++) {
    grad.addColorStop(GRADIENT_STOPS[gi][0], GRADIENT_STOPS[gi][1]);
  }
  gx.fillStyle = grad;
  gx.fillRect(0, 0, 1, G.H);
}
rebuildGradient();

// ===== CANVAS =====
export const cv = document.getElementById('cv');
export const cx = cv.getContext('2d');

// ===== STATE =====
export const S = {
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
  textPos: 'top',
  bodyText: '',
  showPageNum: true
};

// ===== DOM REFS =====
export const $hl   = document.getElementById('inHL');
export const $sub  = document.getElementById('inSub');
export const $body = document.getElementById('inBody');
export const $date = document.getElementById('inDate');
export const $EP   = document.getElementById('EP');
export const $segCtrl = document.getElementById('segCtrl');
export const $segEdit = document.getElementById('segEdit');
export const $segPreview = document.getElementById('segPreview');
export const $bSave = document.getElementById('bSave');
export const $bSaveArrow = document.getElementById('bSaveArrow');
export const $saveMenu = document.getElementById('saveMenu');
export const $bC   = document.getElementById('bC');
export const $bS   = document.getElementById('bS');
export const $togHlCaps = document.getElementById('togHlCaps');
export const $togSubCaps = document.getElementById('togSubCaps');
export const $swapBtn = document.getElementById('swapBtn');
export const $toast   = document.getElementById('toast');
export const $lbTwo     = document.getElementById('lbTwo');
export const $lbStacked = document.getElementById('lbStacked');
export const $lbOne     = document.getElementById('lbOne');
export const $lbNone    = document.getElementById('lbNone');
export const $imgEd   = document.getElementById('imgEd');
export const $hlCount  = document.getElementById('hlCount');
export const $subCount = document.getElementById('subCount');
export const $bodyCount = document.getElementById('bodyCount');
export const $togPageNum = document.getElementById('togPageNum');
export const $hint    = document.getElementById('hint');
export const $fmtBtns = document.querySelectorAll('.fmt');
export const $btnSafeZone = document.getElementById('btnSafeZone');
export const $z  = [document.getElementById('z0'),  document.getElementById('z1')];
export const $pv = [document.getElementById('pv0'), document.getElementById('pv1')];
export const $ph = [document.getElementById('ph0'), document.getElementById('ph1')];
export const $f  = [document.getElementById('f0'),  document.getElementById('f1')];
export const $rm = [document.getElementById('rm0'), document.getElementById('rm1')];
export const $cr = [document.getElementById('cr0'), document.getElementById('cr1')];
export const $sz = [document.getElementById('sz0'), document.getElementById('sz1')];
export const $sx = [document.getElementById('sx0'), document.getElementById('sx1')];
export const $sy = [document.getElementById('sy0'), document.getElementById('sy1')];
export const $vz = [document.getElementById('vz0'), document.getElementById('vz1')];
export const $vx = [document.getElementById('vx0'), document.getElementById('vx1')];
export const $vy = [document.getElementById('vy0'), document.getElementById('vy1')];
export const $cc = [document.getElementById('cc0'), document.getElementById('cc1')];
export const $fsSlider = document.getElementById('fsSlider');
export const $fsVal = document.getElementById('fsVal');
export const $fsReset = document.getElementById('fsReset');
export const $subFsSlider = document.getElementById('subFsSlider');
export const $subFsVal = document.getElementById('subFsVal');
export const $subFsReset = document.getElementById('subFsReset');
export const $credFsSlider = document.getElementById('credFsSlider');
export const $credFsVal = document.getElementById('credFsVal');
export const $credFsReset = document.getElementById('credFsReset');
export const $cr0Wrap = document.getElementById('cr0Wrap');
export const $cr1Wrap = document.getElementById('cr1Wrap');
export const $cropHint = document.getElementById('cropHint');
export const $tpTop = document.getElementById('tpTop');
export const $tpCenter = document.getElementById('tpCenter');
export const $tpBottom = document.getElementById('tpBottom');
export const $caLeft = document.getElementById('caLeft');
export const $caRight = document.getElementById('caRight');
export const $caCenter = document.getElementById('caCenter');
export const $credOffXSlider = document.getElementById('credOffXSlider');
export const $credOffXVal = document.getElementById('credOffXVal');
export const $credOffXReset = document.getElementById('credOffXReset');
export const $credOffYSlider = document.getElementById('credOffYSlider');
export const $credOffYVal = document.getElementById('credOffYVal');
export const $credOffYReset = document.getElementById('credOffYReset');
export const $credShadowToggle = document.getElementById('credShadowToggle');
export const $dropOverlay = document.getElementById('dropOverlay');
export const $themeToggle = document.getElementById('themeToggle');
export const $tplSelect = document.getElementById('tplSelect');
export const $tplLoad = document.getElementById('tplLoad');
export const $tplDel = document.getElementById('tplDel');
export const $tplName = document.getElementById('tplName');
export const $tplSave = document.getElementById('tplSave');
export const $bA   = document.getElementById('bA');
export const $bASaveLabel = $bA.querySelector('.save-label');
export const $bSaveCopy = document.getElementById('bSaveCopy');
export const $bH   = document.getElementById('bH');
export const $histOverlay = document.getElementById('histOverlay');
export const $histDrawer  = document.getElementById('histDrawer');
export const $histClose   = document.getElementById('histClose');
export const $histBody    = document.getElementById('histBody');
export const $histEmpty   = document.getElementById('histEmpty');
export const $histGrid    = document.getElementById('histGrid');
export const $bN = document.getElementById('bN');
export const $loadingOverlay = document.getElementById('loadingOverlay');
// Carousel DOM refs
export const $deckBar = document.getElementById('deckBar');
export const $deckStrip = document.getElementById('deckStrip');
export const $deckLabel = document.getElementById('deckLabel');
export const $deckExportPdf = document.getElementById('deckExportPdf');
export const $deckExportImgs = document.getElementById('deckExportImgs');
export const $deckClose = document.getElementById('deckClose');
export const $tabSingle = document.getElementById('tabSingle');
export const $tabCarousel = document.getElementById('tabCarousel');
export const $bCarouselExportImgs = document.getElementById('bCarouselExportImgs');
export const $bCarouselExportPdf = document.getElementById('bCarouselExportPdf');
export const $appDiv = document.querySelector('.app');
// Design theme DOM refs
export const $designToggle = document.getElementById('designToggle');
export const $designMenu = document.getElementById('designMenu');
// History filter DOM refs
export const $histFilterAll = document.getElementById('histFilterAll');
export const $histFilterSingle = document.getElementById('histFilterSingle');
export const $histFilterCarousel = document.getElementById('histFilterCarousel');
// Toolbar more button
export const $toolbarMoreBtn = document.getElementById('toolbarMoreBtn');

// ===== SHARED DOM HELPERS =====
export function setSaveLabel(text) {
  if ($bASaveLabel) $bASaveLabel.textContent = text;
  else $bA.textContent = text;
}
