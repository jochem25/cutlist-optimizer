# CutList Optimizer - Project Status
**Gegenereerd:** 2025-01-15
**Project:** CutList Optimizer voor 3BM Bouwkunde

---

## 🎯 PROJECT OVERZICHT

**Doel:** Web-based tool voor optimaliseren van zaagplannen (2D bin packing)
**Stack:** React + Vite + Tailwind CSS
**Locatie:** X:\10_3BM_bouwkunde\50_Claude-Code-Projects\CutListOptimizer
**Live:** http://46.224.215.142 (Hetzner VPS)

---

## ✅ AFGERONDE FEATURES (v1.2)

### Core Functionaliteit
- 1D (latten) en 2D (platen) optimalisatie
- Slider 1-10 voor iteraties (vereenvoudigd van 100-25.000)
- Dubbele kerf: Zaagblad + Frees apart instelbaar
- Multi-plaat view met tabs + naast-elkaar weergave

### Data Import/Export
- CSV import/export voor settings, stock en parts
- PDF export met professionele zaagplannen
- localStorage voor auto-save

### Edit Mode (Drag & Drop)
- Mouse-based drag system (geen HTML5 drag API)
- Parkeerplaats voor tijdelijk parkeren onderdelen
- Undo functionaliteit
- Grid (50mm) met visuele lijnen
- Snap to grid/edge (15mm threshold)
- Collision detection met kerf-marge
- Drop preview (groen=vrij, rood=collision)
- Zoom controls (50%-300%)

### Geavanceerde Features
- Complexe vormen support (boundary/holes parsing)
- Virtual stock extraction (rechthoekige gaten als nieuwe voorraad)
- Revit boundary import via pyRevit

---

## 🐛 OPENSTAANDE BUGS (Status: Fixes doorgevoerd, testen vereist)

| # | Bug | Beschrijving | Fix Status |
|---|-----|--------------|------------|
| 1 | Dezelfde plaat verplaatsen | Onderdeel op zelfde plaat herpositioneren werkte niet | ✅ Doorgevoerd |
| 2 | 1D mode parkeerplaats | Terug naar lat vanuit parkeerplaats werkte niet (width=null) | ✅ Doorgevoerd |
| 3 | Legenda layout | Stond links horizontaal, moet rechts verticaal | ✅ Doorgevoerd |
| 4 | Zoom tekst | Zoom schaalde ook tekst labels (alleen platen moeten schalen) | ✅ Doorgevoerd |

**⚠️ Let op:** Na de fixes was er een npm syntax error. Eerst `npm run dev` testen!

---

## ⚠️ KRITIEKE AANDACHTSPUNTEN

### 1. Optimalisatie Algoritme (MAJOR CONCERN)
**Probleem:** 50.000 iteraties berekenen in ~2 seconden is verdacht snel voor NP-hard bin packing.

**Analyse:**
- `maxrects-packer` library is een greedy heuristiek, geen echte optimizer
- De "iteraties" slider doet waarschijnlijk niet wat verwacht wordt
- Resultaten zijn ~90-95% optimaal, maar niet beter

**Voorgestelde oplossingen:**
| Optie | Aanpak | Complexiteit |
|-------|--------|--------------|
| A | Multi-start: shuffle input 1000x, bewaar beste | Laag |
| B | Genetic Algorithm library | Medium |
| C | Python backend met OR-Tools/PuLP/Pyomo | Hoog |

**Aanbeveling:** Optie C (OR-Tools via Python API op Hetzner) voor productie-kwaliteit.

### 2. MCP Server Stabiliteit
- Meerdere MCP servers tegelijk veroorzaakten performance issues
- `read_file` hangt bij grote bestanden (>500 regels)
- **Workaround:** `search_in_files`, `tail_file`, `replace_in_file` gebruiken
- CuttingDiagram.jsx is ~900 regels (technische schuld)

---

## 📁 PROJECT STRUCTUUR

```
X:\10_3BM_bouwkunde\50_Claude-Code-Projects\CutListOptimizer\
├── src/
│   ├── App.jsx                    # Main app, state management
│   ├── components/
│   │   ├── CuttingDiagram.jsx     # ~900 regels, SVG, edit mode, drag/drop
│   │   └── PartsTable.jsx         # Onderdelentabel
│   └── algorithms/
│       ├── optimizer2d.js         # 2D bin packing (maxrects-packer)
│       └── optimizer1d.js         # 1D bin packing
├── deploy/
│   ├── ROADMAP.md                 # Feature roadmap
│   └── deploy.ps1                 # Deployment script
├── SESSION_HANDOFF.md             # Vorige sessie overdracht
└── STATUS.md                      # Dit bestand
```

---

## 🚀 DEPLOYMENT

**Server:** Hetzner VPS (46.224.215.142)
**URL:** http://46.224.215.142

```bash
# Lokaal builden
cd X:\10_3BM_bouwkunde\50_Claude-Code-Projects\CutListOptimizer
npm run build

# Uploaden naar Hetzner
scp -r dist/* root@46.224.215.142:/var/www/cutlist/
```

---

## 📋 ROADMAP / VOLGENDE STAPPEN

### Korte termijn (Bugs & Polish)
1. [ ] npm error fixen en dev server testen
2. [ ] 4 bugfixes verifiëren
3. [ ] Deploy naar Hetzner na succesvolle test

### Medium termijn (Features)
| Feature | Prioriteit | Geschatte tijd |
|---------|------------|----------------|
| pyRevit export script | Hoog | 1 uur |
| PDF huisstijl (3BM branding) | Medium | 1-2 uur |
| Keyboard shortcuts (R, P, Ctrl+Z) | Medium | 30 min |
| Redo functie | Laag | 30 min |

### Lange termijn (Algoritme Upgrade)
| Stap | Beschrijving |
|------|--------------|
| 1 | Python backend API opzetten op Hetzner |
| 2 | OR-Tools integreren voor echte optimalisatie |
| 3 | Frontend aanpassen voor async API calls |
| 4 | Vergelijkende tests: huidige vs. nieuwe algoritme |

---

## 🔧 TECHNISCHE DETAILS

### Collision Detection
```javascript
function checkCollision(part1, part2, kerf = 3) {
  const w1 = part1.width || 1  // 1D mode fix
  const w2 = part2.width || 1
  return !(
    part1.x + part1.length + kerf <= part2.x ||
    part2.x + part2.length + kerf <= part1.x ||
    part1.y + w1 + kerf <= part2.y ||
    part2.y + w2 + kerf <= part1.y
  )
}
```

### Snap Functie
- GRID_SIZE = 50mm
- SNAP_THRESHOLD = 15mm
- Snapt naar: grid, plaatranden, randen andere onderdelen

---

## 📞 PROJECT INFO

**Eigenaar:** Jochem (3BM Bouwkunde)
**Branding:** Zie 3BMStamkaart.pdf voor huisstijl kleuren/fonts
**Status document:** Laatst bijgewerkt 2025-01-15
