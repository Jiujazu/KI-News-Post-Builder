import { describe, it, expect } from 'vitest';
import {
  isoToDE, deToISO, todayISO, todayDE,
  defaultCrop, FORMATS, MONTHS_DE,
  buildSlideData, loadSlideFromSaved
} from './utils.js';

// ===== 1. Date Conversion =====

describe('isoToDE', function() {
  it('converts standard date', function() {
    expect(isoToDE('2025-03-09')).toBe('9. März 2025');
  });

  it('converts January date', function() {
    expect(isoToDE('2024-01-01')).toBe('1. Januar 2024');
  });

  it('converts December date', function() {
    expect(isoToDE('2023-12-31')).toBe('31. Dezember 2023');
  });

  it('handles leading zeros in day', function() {
    expect(isoToDE('2025-06-05')).toBe('5. Juni 2025');
  });

  it('returns input for invalid format (no dashes)', function() {
    expect(isoToDE('20250309')).toBe('20250309');
  });

  it('returns input for invalid month 0', function() {
    expect(isoToDE('2025-00-01')).toBe('2025-00-01');
  });

  it('returns input for invalid month 13', function() {
    expect(isoToDE('2025-13-01')).toBe('2025-13-01');
  });

  it('handles all 12 months correctly', function() {
    for (var m = 0; m < 12; m++) {
      var iso = '2025-' + String(m + 1).padStart(2, '0') + '-15';
      var result = isoToDE(iso);
      expect(result).toContain(MONTHS_DE[m]);
    }
  });
});

describe('deToISO', function() {
  it('converts standard German date', function() {
    expect(deToISO('9. März 2025')).toBe('2025-03-09');
  });

  it('converts date with two-digit day', function() {
    expect(deToISO('31. Dezember 2023')).toBe('2023-12-31');
  });

  it('converts January date', function() {
    expect(deToISO('1. Januar 2024')).toBe('2024-01-01');
  });

  it('returns empty string for invalid input', function() {
    expect(deToISO('invalid')).toBe('');
  });

  it('returns empty string for unknown month', function() {
    expect(deToISO('1. Foobar 2025')).toBe('');
  });

  it('roundtrips with isoToDE', function() {
    var iso = '2025-07-14';
    expect(deToISO(isoToDE(iso))).toBe(iso);
  });
});

describe('todayISO', function() {
  it('returns YYYY-MM-DD format', function() {
    var result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches current date', function() {
    var now = new Date();
    var expected = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    expect(todayISO()).toBe(expected);
  });
});

describe('todayDE', function() {
  it('returns German formatted date', function() {
    var result = todayDE();
    // Should contain a German month name
    var hasMonth = MONTHS_DE.some(function(m) { return result.indexOf(m) !== -1; });
    expect(hasMonth).toBe(true);
  });

  it('roundtrips to ISO', function() {
    var de = todayDE();
    var iso = deToISO(de);
    expect(iso).toBe(todayISO());
  });
});

// ===== 2. defaultCrop =====

describe('defaultCrop', function() {
  it('returns correct default values', function() {
    var crop = defaultCrop();
    expect(crop).toEqual({ x: 50, y: 50, z: 100, flip: false, cropH: 100 });
  });

  it('returns a new object each call (no shared reference)', function() {
    var a = defaultCrop();
    var b = defaultCrop();
    expect(a).not.toBe(b);
    a.x = 999;
    expect(b.x).toBe(50);
  });
});

// ===== 3. FORMATS =====

describe('FORMATS', function() {
  it('has all 4 format keys', function() {
    expect(Object.keys(FORMATS)).toHaveLength(4);
    expect(FORMATS).toHaveProperty('4:5');
    expect(FORMATS).toHaveProperty('1:1');
    expect(FORMATS).toHaveProperty('16:9');
    expect(FORMATS).toHaveProperty('9:16');
  });

  it('4:5 has correct dimensions', function() {
    expect(FORMATS['4:5']).toEqual({ w: 1200, h: 1500 });
  });

  it('1:1 is square', function() {
    expect(FORMATS['1:1'].w).toBe(FORMATS['1:1'].h);
  });

  it('16:9 is landscape', function() {
    expect(FORMATS['16:9'].w).toBeGreaterThan(FORMATS['16:9'].h);
  });

  it('9:16 is portrait', function() {
    expect(FORMATS['9:16'].h).toBeGreaterThan(FORMATS['9:16'].w);
  });

  it('aspect ratios are correct', function() {
    var f45 = FORMATS['4:5'];
    expect(f45.w / f45.h).toBeCloseTo(4 / 5, 2);

    var f11 = FORMATS['1:1'];
    expect(f11.w / f11.h).toBeCloseTo(1, 2);

    var f169 = FORMATS['16:9'];
    expect(f169.w / f169.h).toBeCloseTo(16 / 9, 2);

    var f916 = FORMATS['9:16'];
    expect(f916.w / f916.h).toBeCloseTo(9 / 16, 2);
  });
});

// ===== 4. buildSlideData =====

describe('buildSlideData', function() {
  function makeSnap() {
    return {
      hlLines: ['Zeile 1', 'Zeile 2'],
      subText: 'Untertitel',
      dateText: '9. März 2025',
      layout: 'two',
      format: '4:5',
      hlCaps: true,
      subCaps: false,
      hlFSOverride: 140,
      subFSOverride: 60,
      credFSOverride: 20,
      credAlign: 'left',
      credOffX: 5,
      credOffY: -3,
      credShadow: true,
      textPos: 'bottom',
      creds: ['Foto: Max', 'Foto: Anna'],
      crop: [
        { x: 30, y: 40, z: 120, flip: true, cropH: 80 },
        { x: 50, y: 50, z: 100, flip: false, cropH: 100 }
      ]
    };
  }

  it('joins headline lines with newline', function() {
    var data = buildSlideData(makeSnap());
    expect(data.headline).toBe('Zeile 1\nZeile 2');
  });

  it('copies all fields correctly', function() {
    var data = buildSlideData(makeSnap());
    expect(data.subtitle).toBe('Untertitel');
    expect(data.date).toBe('9. März 2025');
    expect(data.layout).toBe('two');
    expect(data.format).toBe('4:5');
    expect(data.hlCaps).toBe(true);
    expect(data.subCaps).toBe(false);
    expect(data.credAlign).toBe('left');
    expect(data.credShadow).toBe(true);
    expect(data.textPos).toBe('bottom');
  });

  it('deep-copies credits (not same array)', function() {
    var snap = makeSnap();
    var data = buildSlideData(snap);
    data.credits[0] = 'CHANGED';
    expect(snap.creds[0]).toBe('Foto: Max');
  });

  it('deep-copies crops (not same objects)', function() {
    var snap = makeSnap();
    var data = buildSlideData(snap);
    data.crops[0].x = 999;
    expect(snap.crop[0].x).toBe(30);
  });

  it('normalizes missing cropH to 100', function() {
    var snap = makeSnap();
    delete snap.crop[1].cropH;
    var data = buildSlideData(snap);
    expect(data.crops[1].cropH).toBe(100);
  });

  it('normalizes flip to boolean', function() {
    var snap = makeSnap();
    snap.crop[0].flip = 1;
    snap.crop[1].flip = undefined;
    var data = buildSlideData(snap);
    expect(data.crops[0].flip).toBe(true);
    expect(data.crops[1].flip).toBe(false);
  });
});

// ===== 5. loadSlideFromSaved =====

describe('loadSlideFromSaved', function() {
  function makeSaved() {
    return {
      headline: 'Zeile 1\nZeile 2',
      subtitle: 'Untertitel',
      date: '9. März 2025',
      layout: 'two',
      format: '1:1',
      hlCaps: true,
      subCaps: true,
      hlFSOverride: 140,
      subFSOverride: 60,
      credFSOverride: 20,
      credAlign: 'center',
      credOffX: 10,
      credOffY: -5,
      credShadow: true,
      textPos: 'center',
      credits: ['Foto: A', 'Foto: B'],
      crops: [
        { x: 30, y: 40, z: 110, flip: true, cropH: 75 },
        { x: 50, y: 50, z: 100, flip: false, cropH: 100 }
      ]
    };
  }

  it('splits headline into hlLines', function() {
    var slide = loadSlideFromSaved(makeSaved());
    expect(slide.hlLines).toEqual(['Zeile 1', 'Zeile 2']);
  });

  it('restores all fields', function() {
    var slide = loadSlideFromSaved(makeSaved());
    expect(slide.subText).toBe('Untertitel');
    expect(slide.dateText).toBe('9. März 2025');
    expect(slide.layout).toBe('two');
    expect(slide.format).toBe('1:1');
    expect(slide.hlCaps).toBe(true);
    expect(slide.credAlign).toBe('center');
    expect(slide.textPos).toBe('center');
  });

  it('initializes image arrays to null', function() {
    var slide = loadSlideFromSaved(makeSaved());
    expect(slide.imgs).toEqual([null, null]);
    expect(slide.blobs).toEqual([null, null]);
    expect(slide.draftBlobs).toEqual([null, null]);
  });

  it('deep-copies credits', function() {
    var saved = makeSaved();
    var slide = loadSlideFromSaved(saved);
    slide.creds[0] = 'CHANGED';
    expect(saved.credits[0]).toBe('Foto: A');
  });

  it('deep-copies crops', function() {
    var saved = makeSaved();
    var slide = loadSlideFromSaved(saved);
    slide.crop[0].x = 999;
    expect(saved.crops[0].x).toBe(30);
  });

  it('provides defaults for missing fields', function() {
    var slide = loadSlideFromSaved({});
    expect(slide.hlLines).toEqual(['']);
    expect(slide.subText).toBe('');
    expect(slide.layout).toBe('one');
    expect(slide.format).toBe('4:5');
    expect(slide.hlCaps).toBe(false);
    expect(slide.credAlign).toBe('right');
    expect(slide.textPos).toBe('top');
    expect(slide.hlFSOverride).toBe(0);
  });

  it('provides default crops when crops missing', function() {
    var slide = loadSlideFromSaved({});
    expect(slide.crop).toEqual([defaultCrop(), defaultCrop()]);
    // Ensure they are independent objects
    slide.crop[0].x = 0;
    expect(slide.crop[1].x).toBe(50);
  });

  it('provides default credits when credits missing', function() {
    var slide = loadSlideFromSaved({});
    expect(slide.creds).toEqual(['', '']);
  });

  it('roundtrips with buildSlideData', function() {
    var original = makeSaved();
    var slide = loadSlideFromSaved(original);
    var rebuilt = buildSlideData(slide);
    expect(rebuilt.headline).toBe(original.headline);
    expect(rebuilt.subtitle).toBe(original.subtitle);
    expect(rebuilt.layout).toBe(original.layout);
    expect(rebuilt.format).toBe(original.format);
    expect(rebuilt.hlCaps).toBe(original.hlCaps);
    expect(rebuilt.credAlign).toBe(original.credAlign);
    expect(rebuilt.textPos).toBe(original.textPos);
    expect(rebuilt.credits).toEqual(original.credits);
    expect(rebuilt.crops).toEqual(original.crops);
  });
});
