# CutList Optimizer - Claude Code Project Brief

## Project Overzicht

**Naam:** CutList Optimizer  
**Eigenaar:** 3BM Bouwkunde  
**Doel:** Web-based tool voor het optimaliseren van zaagplannen voor plaatmateriaal (2D) en balken/latten (1D)

## Status: ✅ FEATURE COMPLETE

| Feature | Status |
|---------|--------|
| Project setup (Vite + React + Tailwind) | ✅ |
| UI componenten | ✅ |
| 1D cutting algoritme (FFD) | ✅ |
| 2D bin packing (3 algoritmes) | ✅ |
| Help documentatie | ✅ |
| CSV opslaan/openen | ✅ |
| PDF export met maatvoering | ✅ |
| localStorage auto-save | ✅ |
| Docker configuratie | ✅ |

## Tech Stack

- **Frontend:** React 18 met Vite
- **Styling:** Tailwind CSS
- **PDF Export:** jsPDF
- **2D Packing:** maxrects-packer + eigen hybride implementatie
- **Build:** Vite
- **Deployment:** Docker container (nginx)

## Ontwikkel Commands

```bash
# Development server (lokaal testen)
npm run dev

# Production build
npm run build

# Docker build & run
docker-compose up --build

# Of handmatig:
docker build -t cutlist-optimizer .
docker run -p 8080:80 cutlist-optimizer
```

## 3BM Huisstijl Kleuren

```javascript
const colors = {
  violet: '#595678',      // Primaire kleur - headers
  verdigris: '#4DA6A6',   // Accent - buttons, highlights
  yellow: '#EFBD75',      // Friendly Yellow - warnings
  magenta: '#A01C48',     // Warm Magenta
  peach: '#DB4C40',       // Flaming Peach - errors
};
```

## Bestandsstructuur

```
D:\CutListOptimizer\
├── CLAUDE.md                 # Dit bestand
├── package.json
├── vite.config.js
├── tailwind.config.js
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .dockerignore
├── src/
│   ├── main.jsx
│   ├── App.jsx               # Hoofd component met state management
│   ├── index.css
│   ├── components/
│   │   ├── Header.jsx        # Logo, Open/Save/PDF/Help knoppen
│   │   ├── SettingsPanel.jsx # Mode toggle, algoritme, kerf, iteraties
│   │   ├── StockList.jsx     # Voorraad beheer
│   │   ├── PartsList.jsx     # Onderdelen beheer
│   │   ├── CuttingDiagram.jsx # Visueel zaagplan
│   │   ├── PartsTable.jsx    # Stuklijst tabel
│   │   └── HelpModal.jsx     # Documentatie modal
│   ├── algorithms/
│   │   ├── cutting1D.js      # First Fit Decreasing
│   │   └── cutting2D.js      # Hybride/MaxRects/Guillotine
│   └── utils/
│       └── pdfExport.js      # PDF generatie met jsPDF
```

## 2D Algoritmes

1. **Hybride (aanbevolen):** Iteratief + Guillotine, kleinste plaat eerst
2. **MaxRects Packer:** Snelle library, deterministisch
3. **Guillotine Only:** Puur guillotine, groot→klein

## Strategie

- **Bin-centric:** Platen worden gesorteerd klein→groot
- Kleinste platen worden eerst volledig gevuld
- Kerf alleen toegepast bij splits, niet bij fit-check
- Nerf-richting voorkomt rotatie per stuk

## CSV Formaat

```csv
[SETTINGS]
mode,kerf,grainDirection,algorithm,maxIterations
2d,3,true,hybrid,5000

[STOCK]
name,length,width,quantity
Multiplex 18mm,2440,1220,3

[PARTS]
name,length,width,quantity,grain,stockType
Zijwand L,800,400,2,true,Multiplex 18mm
```

## Test Data

**2D Voorraad:**
- Multiplex 18mm: 2440×1220 (3x), 800×400 (2x), 740×1200 (1x)
- MDF 12mm: 2440×1220 (2x)

**1D Voorraad:**
- KVH 60×120: 5000mm (10x)
- Lat 40×60: 4000mm (20x)
- Plint 25×140: 2440mm (3x), 3050mm (4x)
