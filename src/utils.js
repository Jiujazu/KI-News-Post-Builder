// ===== PURE UTILITY FUNCTIONS =====
// No DOM dependencies — safe to import in tests.

export var MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function isoToDE(iso) {
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var day = parseInt(p[2],10), m = parseInt(p[1],10)-1;
  if (m < 0 || m > 11) return iso;
  return day + '. ' + MONTHS_DE[m] + ' ' + parseInt(p[0],10);
}

export function deToISO(de) {
  var match = de.match(/^(\d{1,2})\.\s*(\S+)\s+(\d{4})$/);
  if (!match) return '';
  var m = MONTHS_DE.indexOf(match[2]);
  if (m === -1) return '';
  return match[3] + '-' + String(m+1).padStart(2,'0') + '-' + String(parseInt(match[1],10)).padStart(2,'0');
}

export function todayDE() {
  return isoToDE(todayISO());
}

export function defaultCrop() {
  return {x:50, y:50, z:100, flip:false, cropH:100};
}

export var FORMATS = {
  '4:5':  { w: 1200, h: 1500 },
  '1:1':  { w: 1200, h: 1200 },
  '16:9': { w: 1200, h: 675 },
  '9:16': { w: 1080, h: 1920 }
};

export function buildSlideData(snap) {
  return {
    headline: snap.hlLines.join('\n'), subtitle: snap.subText, bodyText: snap.bodyText || '', date: snap.dateText,
    layout: snap.layout, format: snap.format || '4:5',
    hlCaps: snap.hlCaps, subCaps: snap.subCaps,
    hlFSOverride: snap.hlFSOverride, subFSOverride: snap.subFSOverride, credFSOverride: snap.credFSOverride,
    credAlign: snap.credAlign, credOffX: snap.credOffX, credOffY: snap.credOffY,
    credShadow: snap.credShadow, textPos: snap.textPos, showPageNum: snap.showPageNum !== false,
    credits: snap.creds.slice(),
    crops: snap.crop.map(function(c) { return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100}; })
  };
}

export function loadSlideFromSaved(slideData) {
  return {
    imgs: [null, null], blobs: [null, null], draftBlobs: [null, null],
    creds: (Array.isArray(slideData.credits) && slideData.credits.length === 2) ? slideData.credits.slice() : ['', ''],
    crop: (Array.isArray(slideData.crops) && slideData.crops.length === 2)
      ? slideData.crops.map(function(c) {
          if (c && typeof c === 'object' && 'x' in c) return {x:c.x, y:c.y, z:c.z, flip:!!c.flip, cropH:c.cropH||100};
          return defaultCrop();
        })
      : [defaultCrop(), defaultCrop()],
    layout: slideData.layout || 'one', format: slideData.format || '4:5',
    hlCaps: !!slideData.hlCaps, subCaps: !!slideData.subCaps,
    hlLines: slideData.headline ? slideData.headline.split('\n') : [''],
    subText: slideData.subtitle || '', bodyText: slideData.bodyText || '', dateText: slideData.date || todayDE(),
    hlFSOverride: slideData.hlFSOverride || 0, subFSOverride: slideData.subFSOverride || 0,
    credFSOverride: slideData.credFSOverride || 0, credAlign: slideData.credAlign || 'right',
    credOffX: slideData.credOffX || 0, credOffY: slideData.credOffY || 0,
    credShadow: !!slideData.credShadow, textPos: slideData.textPos || 'top',
    showPageNum: slideData.showPageNum !== false
  };
}
