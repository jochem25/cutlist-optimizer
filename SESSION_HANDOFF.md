# CutList Optimizer - Session Handoff
**Datum:** 2025-01-14
**Status:** Bugfixes in progress, npm error

---

## 🎯 PROJECT OVERZICHT

**Applicatie:** CutList Optimizer v2.0
**Doel:** Web-based tool voor optimaliseren van zaagplannen (bin packing)
**Stack:** React + Vite + Tailwind CSS
**Locatie:** D:\CutListOptimizer
**Deployment:** Hetzner VPS (46.224.215.142)

---

## ✅ WERKENDE FEATURES

### Core
- 1D (latten) en 2D (platen) optimalisatie
- CSV import/export
- PDF export
- Multi-plaat view met tabs
- Complex shapes met boundary/holes parsing
- Virtual stock extraction (rechthoekige gaten hergebruiken)

### Edit Mode (nieuw)
- Drag & drop met mouse-based system (geen HTML5 drag API)
- Parkeerplaats voor tijdelijk parkeren onderdelen
- Undo functionaliteit
- Grid (50mm) met visuele lijnen
- Snap to grid/edge (15mm threshold)
- Collision detection met kerf
- Drop preview (groen=vrij, rood=collision)
- Zoom controls (50%-300%)

---

## 🐛 HUIDIGE BUGS (zojuist gefixed, niet getest)

### Fix 1: Dezelfde plaat verplaatsen
**Probleem:** Onderdeel op dezelfde plaat herpositioneren werkte niet
**Fix:** Regel 274 aangepast - alleen blokkeren als source === target EN parking
```javascript
const isSameLocation = sourceType === targetType && sourceIndex === targetIndex && sourceType === 'parking'
```

### Fix 2: 1D mode terug naar lat
**Probleem:** Vanuit parkeerplaats terug naar lat werkte niet (width=null)
**Fix:** checkCollision, isWithinBounds, findFreePosition aangepast voor width || 1

### Fix 3: Legenda layout
**Probleem:** Legenda stond links, horizontaal
**Fix:** In edit mode nu rechts uitgelijnd, verticaal onder elkaar

### Fix 4: Zoom alleen platen
**Probleem:** Zoom schaalde hele container incl. tekst
**Fix:** Transform scale verwijderd van container, zoomLevel in sheetScale verwerkt

---

## ❌ HUIDIGE ERROR

Bij `npm run dev` krijgt gebruiker "gzip heb ik niet" error.
Mogelijke oorzaak: syntax error in CuttingDiagram.jsx door incomplete replace.

**Te checken:**
```bash
cd D:\CutListOptimizer
npm run dev
```

---

## 📁 BELANGRIJKE BESTANDEN

| Bestand | Beschrijving |
|---------|--------------|
| `src/App.jsx` | Main app, state management |
| `src/components/CuttingDiagram.jsx` | ~900 regels, SVG rendering, edit mode, drag/drop |
| `src/components/PartsTable.jsx` | Onderdelentabel |
| `src/algorithms/optimizer2d.js` | 2D bin packing |
| `src/algorithms/optimizer1d.js` | 1D bin packing |
| `deploy/ROADMAP.md` | Feature roadmap |

---

## 🔧 TECHNISCHE DETAILS

### Collision Detection
```javascript
function checkCollision(part1, part2, kerf = 3) {
  const w1 = part1.width || 1
  const w2 = part2.width || 1
  return !(
    part1.x + part1.length + kerf <= part2.x ||
    part2.x + part2.length + kerf <= part1.x ||
    part1.y + w1 + kerf <= part2.y ||
    part2.y + w2 + kerf <= part1.y
  )
}
```

### Snap functie
- GRID_SIZE = 50mm
- SNAP_THRESHOLD = 15mm
- Snapt naar: grid, plaatranden, randen van andere onderdelen

### Props flow
```
App.jsx -> CuttingDiagram
  - mode ('1d' | '2d')
  - results (sheets array)
  - setResults (voor edit mode save)
  - kerf (bladeThickness)
```

---

## 📋 VOLGENDE STAPPEN

1. **Fix npm error** - Check CuttingDiagram.jsx voor syntax errors
2. **Test 4 bugfixes** - Verifieer dat alle fixes werken
3. **Deploy naar Hetzner** - Na succesvolle test

### Roadmap (na bugfixes)
| Feature | Prioriteit | Tijd |
|---------|------------|------|
| pyRevit export script | Hoog | 1 uur |
| PDF huisstijl (3BM branding) | Medium | 1-2 uur |
| Keyboard shortcuts (R, P, Ctrl+Z) | Medium | 30 min |
| Redo functie | Laag | 30 min |

---

## ⚠️ BEKENDE ISSUES

### MCP Server
- `read_file` hangt bij grote bestanden (>500 regels)
- Workaround: gebruik `tail_file`, `search_in_files`, `replace_in_file`
- Claude desktop app gebruikt veel geheugen (1600mb), herstart helpt

### CuttingDiagram.jsx
- Bestand is ~900 regels, moeilijk te lezen via MCP
- Gebruik `tail_file` met lines=100-200 voor stukjes

---

## 🏗️ DEPLOYMENT

```bash
# Lokaal builden
cd D:\CutListOptimizer
npm run build

# Uploaden naar Hetzner
scp -r dist/* root@46.224.215.142:/var/www/cutlist/

# Of via deploy script
.\deploy\deploy.ps1
```

---

## 📞 CONTACT

Project owner: Jochem (3BM Bouwkunde)
