# Code-Audit: KI News Post Builder

**Datum:** 2. März 2026
**Auditor:** Claude (Senior Software Engineer Review)
**Scope:** Gesamte Codebasis (`index.html`, ~1395 Zeilen)

---

## Architektur-Überblick

Die gesamte Anwendung lebt in einer einzigen `index.html` (CSS + HTML + JS inline). Es gibt kein Modulsystem, keinen Build-Prozess und keinen Linter. Der globale Zustand wird über ein mutables Objekt `S` verwaltet.

---

## 1. KRITISCH — Memory Leak bei Thumbnail-Blob-URLs

**Zeilen:** 1228–1243

```js
function loadHistoryGrid() {
  dbGetAll().then(function(posts) {
    $histGrid.innerHTML = '';          // ← zerstört DOM-Knoten
    posts.forEach(function(post) {
      if (post.thumbnail) {
        var thumbUrl = URL.createObjectURL(post.thumbnail);
        img.src = thumbUrl;
        img.onload = function() { URL.revokeObjectURL(thumbUrl); };
      }
    });
  });
}
```

**Problem:** Wenn `loadHistoryGrid()` schnell hintereinander aufgerufen wird (z.B. nach dem Löschen eines Posts, Zeile 1268), werden alle DOM-Knoten via `innerHTML = ''` entfernt. Thumbnails, die noch laden, verlieren ihre `onload`-Handler — die zugehörigen Blob-URLs werden **nie revoked**. Bei jedem Aufruf werden neue Blob-URLs erzeugt, alte bleiben im Speicher.

**Fix:**
```js
var activeThumbUrls = [];
function loadHistoryGrid() {
  activeThumbUrls.forEach(function(u) { URL.revokeObjectURL(u); });
  activeThumbUrls = [];
  dbGetAll().then(function(posts) {
    $histGrid.innerHTML = '';
    posts.forEach(function(post) {
      if (post.thumbnail) {
        var thumbUrl = URL.createObjectURL(post.thumbnail);
        activeThumbUrls.push(thumbUrl);
        img.src = thumbUrl;
      }
    });
  });
}
```

---

## 2. KRITISCH — Race Condition bei Archiv-IDs (Datenverlust)

**Zeile:** 1185

```js
var post = {
  id: Date.now(),   // ← Millisekunden-Timestamp als Primary Key
```

**Problem:** `Date.now()` gibt Millisekunden zurück. Doppelklick auf „Archivieren" oder programmatischer Aufruf erzeugt identische IDs. Da IndexedDB mit `put()` arbeitet (Zeile 498), wird der vorherige Post **stillschweigend überschrieben**.

**Fix:**
```js
id: Date.now().toString(36) + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
```

---

## 3. KRITISCH — `toBlob()` kann `null` zurückgeben → stille Fehler

**Zeilen:** 525–550

```js
function compressImage(img, maxSide, quality) {
  return new Promise(function(resolve) {
    c.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', quality);
    //                         ^^^^^^^^^^^^^ blob kann null sein!
  });
}

function canvasToThumbnail(canvas, maxW) {
  return new Promise(function(resolve) {
    c.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.85);
  });
}
```

**Problem:** Laut Spezifikation kann `toBlob()` den Callback mit `null` aufrufen (korrupter Canvas, Origin-Tainting, Speichermangel). Beide Funktionen resolven dann mit `null`. Die Archivierung speichert `null`-Werte in IndexedDB. Beim Laden des archivierten Posts schlägt `URL.createObjectURL(null)` fehl.

**Fix:**
```js
c.toBlob(function(blob) {
  if (blob) resolve(blob);
  else reject(new Error('toBlob returned null'));
}, 'image/jpeg', quality);
```

---

## 4. MITTEL — IndexedDB-Verbindung wird bei jeder Operation neu geöffnet

**Zeilen:** 480–523

```js
function dbAdd(post) {
  return dbOpen().then(function(db) { /* ... */ });
}
function dbGetAll() {
  return dbOpen().then(function(db) { /* ... */ });
}
function dbDelete(id) {
  return dbOpen().then(function(db) { /* ... */ });
}
```

**Problem:** `dbOpen()` führt jedes Mal `indexedDB.open()` aus. Die Verbindung wird **nie geschlossen** (`db.close()` wird nie aufgerufen). Bei schnellem Durchklicken im Archiv entstehen zahlreiche offene Handles.

**Fix:** Singleton-Verbindung cachen:
```js
var _dbPromise = null;
function dbOpen() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = function(e) { /* ... */ };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { _dbPromise = null; reject(e.target.error); };
  });
  return _dbPromise;
}
```

---

## 5. MITTEL — Export-Timing: `scheduleDraw()` + sofortiger `toBlob()`

**Zeilen:** 764–791 (sowie 797, 816, 1171)

```js
$bX.addEventListener('click', function() {
  btn.disabled = true; btn.textContent = 'Speichert…';
  scheduleDraw();                    // ← plant draw im nächsten rAF
  requestAnimationFrame(function() { // ← ebenfalls nächster rAF
    cv.toBlob(function(blob) {       // ← liest Canvas
```

**Problem:** `scheduleDraw()` plant ein `draw()` via `requestAnimationFrame`. Der nachfolgende `requestAnimationFrame`-Callback wird im **selben Frame** in die Queue gestellt. Die Reihenfolge ist nicht garantiert. Im schlimmsten Fall wird `toBlob()` **vor** `draw()` ausgeführt, und das exportierte Bild zeigt den alten Canvas-Zustand.

**Fix:** `draw()` direkt synchron aufrufen:
```js
$bX.addEventListener('click', function() {
  btn.disabled = true; btn.textContent = 'Speichert…';
  draw();  // ← synchron!
  cv.toBlob(function(blob) { /* ... */ }, 'image/jpeg', 0.95);
});
```

---

## 6. MITTEL — Keine Validierung der `creds`-Array-Länge beim Laden

**Zeile:** 590

```js
if (Array.isArray(saved.creds)) S.creds = saved.creds;
```

**Problem:** Kein Check auf die Array-Länge. Ein manipulierter `localStorage`-Wert mit `creds: ["a"]` oder `creds: ["a","b","c","d"]` wird direkt übernommen. Späterer Zugriff auf `S.creds[1]` liefert `undefined`, was als `"undefined"` auf dem Canvas gerendert wird.

**Fix:**
```js
if (Array.isArray(saved.creds) && saved.creds.length === 2) S.creds = saved.creds;
```

---

## 7. MITTEL — `innerHTML` statt `textContent`

**Zeile:** 1262

```js
del.innerHTML = '&times;';
```

**Problem:** Zwar ist `'&times;'` ein fester String, aber das Muster `innerHTML` mit Datenbankwerten ist gefährlich. Wenn jemand das Pattern kopiert und `post.headline` dort einsetzt, entsteht sofort eine XSS-Lücke.

**Fix:**
```js
del.textContent = '×';  // Unicode-Zeichen direkt
```

---

## 8. MITTEL — Headline-Zeilenlimit inkonsistent (2 vs. 3)

**Zeilen:** 850 vs. 379

```js
// Input-Handler (Zeile 850):
if (parts.length > 2) { parts = parts.slice(0, 2); this.value = parts.join('\n'); }

// Rendering-Konstante (Zeile 379):
var HL_MAX_LINES = 3;       // max wrapped headline lines
```

**Problem:** Der Input beschränkt manuelle Zeilenumbrüche auf 2, aber der Word-Wrap erlaubt 3 umbrochene Zeilen. Inkonsistentes Verhalten.

**Fix:** Semantik angleichen — entweder Input auf 3 erhöhen oder `HL_MAX_LINES` auf 2 senken.

---

## 9. MITTEL — Phantom-Credits nach Reload ohne Bilder

**Zeilen:** 566–572

```js
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    hlLines: S.hlLines, subText: S.subText, dateText: S.dateText,
    layout: S.layout, format: S.format, allCaps: S.allCaps, creds: S.creds
    // imgs, blobs → NICHT gespeichert
  }));
}
```

**Problem:** Nach einem Seiten-Reload werden Credits wiederhergestellt, aber die zugehörigen Bilder fehlen. Der Benutzer sieht leere Bild-Platzhalter, während Credits am Placeholder-Text auf dem Canvas gerendert werden.

**Fix:** Credits beim Laden ohne Bilder zurücksetzen, oder Credits nicht im localStorage speichern.

---

## 10. NIEDRIG — Logo ohne `onload`/`onerror`

**Zeilen:** 393–394

```js
var LOGO = new Image();
LOGO.src = "logo.png";
```

**Problem:** Kein `onerror`-Handler. Wenn das Logo nach `init()` lädt, wird `draw()` nicht erneut getriggert — das Logo fehlt beim ersten Render.

**Fix:**
```js
LOGO.onload = function() { scheduleDraw(); };
LOGO.onerror = function() { console.warn('Logo konnte nicht geladen werden'); };
LOGO.src = "logo.png";
```

---

## 11. NIEDRIG — Variable `sl` überschattet `$sl`-Referenz

**Zeile:** 1042 vs. 465

```js
for (var sl = 0; sl < subLines.length; sl++) { ... }
//       ^^ überschattet $sl
```

**Fix:** Loopvariable umbenennen in `si` oder `sli`.

---

## 12. NIEDRIG — `var` überall statt `let`/`const`

Die gesamte Codebasis nutzt `var` (Function-Scoping). Dies erfordert z.B. IIFEs in Zeile 909–913 für korrekte Closures. Mit `let` wäre das unnötig.

---

## 13. NIEDRIG — Keine CSP-Meta-Tags

Kein `Content-Security-Policy`-Header oder Meta-Tag vorhanden.

**Fix:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob:;">
```

---

## 14. NIEDRIG — Unnötige Funktions-Wrapper für Limits

**Zeilen:** 561–562

```js
function hlLimits() { return CHAR_LIMITS.hl; }
function subLimits() { return CHAR_LIMITS.sub; }
```

Diese Funktionen geben immer denselben statischen Wert zurück. Unnötige Indirektion ohne dynamischen Nutzen.

---

## Zusammenfassung

| # | Problem | Schweregrad | Zeile(n) |
|---|---------|-------------|----------|
| 1 | Blob-URL-Leak bei Thumbnail-Neuladen | **Kritisch** | 1228–1243 |
| 2 | `Date.now()` als ID → Überschreibung | **Kritisch** | 1185 |
| 3 | `toBlob()` null → korrupte Archiv-Daten | **Kritisch** | 525–550 |
| 4 | IndexedDB-Verbindung nie gecacht/geschlossen | Mittel | 480–523 |
| 5 | Race Condition: `scheduleDraw` vor `toBlob` | Mittel | 764–791 |
| 6 | Keine Validierung der `creds`-Array-Länge | Mittel | 590 |
| 7 | `innerHTML` statt `textContent` | Mittel | 1262 |
| 8 | Headline-Zeilenlimit inkonsistent (2 vs. 3) | Mittel | 850/379 |
| 9 | Phantom-Credits nach Reload ohne Bilder | Mittel | 566–572 |
| 10 | Logo ohne `onload`/`onerror` | Niedrig | 393–394 |
| 11 | Variable `sl` überschattet `$sl` | Niedrig | 1042 |
| 12 | `var` überall statt `let`/`const` | Niedrig | global |
| 13 | Keine CSP-Header | Niedrig | `<head>` |
| 14 | Unnötige Funktions-Wrapper für Limits | Niedrig | 561–562 |
