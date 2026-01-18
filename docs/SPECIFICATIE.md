# Technische Specificatie - CutList Optimizer

## 1. Algoritmes

### 1.1 1D Cutting Stock (First Fit Decreasing)

**Input:**
```javascript
{
  stock: [
    { id: 1, length: 5000, qty: 10 },  // Beschikbare balken
    { id: 2, length: 4000, qty: 20 }
  ],
  parts: [
    { id: 1, name: "Stijl", length: 2400, qty: 8 },
    { id: 2, name: "Regel", length: 980, qty: 4 }
  ],
  kerf: 3  // Zaagblad dikte in mm
}
```

**Algoritme:**
1. Expandeer parts naar individuele stukken (qty → array)
2. Sorteer stukken van groot naar klein
3. Voor elk stuk:
   - Zoek eerste balk waar het past (restlengte >= stuklengte + kerf)
   - Als geen balk past, open nieuwe balk uit voorraad
   - Plaats stuk en update restlengte (trek stuklengte + kerf af)
4. Return verdeling per balk

**Output:**
```javascript
{
  success: true,
  usedStock: [
    {
      stockId: 1,
      stockLength: 5000,
      parts: [
        { id: 1, name: "Stijl", length: 2400, position: 0 },
        { id: 1, name: "Stijl", length: 2400, position: 2403 }
      ],
      waste: 194,  // 5000 - 2400 - 3 - 2400 - 3
      efficiency: 96.1
    }
  ],
  totalWaste: 1234,
  totalEfficiency: 94.5,
  unplacedParts: []  // Stukken die niet pasten
}
```

### 1.2 2D Bin Packing (Guillotine met Shelf)

**Input:**
```javascript
{
  stock: [
    { id: 1, length: 2440, width: 1220, qty: 3 }
  ],
  parts: [
    { id: 1, name: "Zijwand", length: 800, width: 400, qty: 2, grain: true }
  ],
  kerf: 3,
  grainDirection: true,  // Moet rekening houden met nerf
  maxIterations: 5000
}
```

**Algoritme (Shelf-based):**
1. Expandeer parts naar individuele stukken
2. Sorteer op hoogte (width) aflopend, dan op lengte aflopend
3. Voor elke plaat:
   - Initialiseer shelves = []
   - Voor elk ongeplaatst stuk:
     - Probeer op bestaande shelf te plaatsen (als past in resterende breedte)
     - Als niet past, start nieuwe shelf (als hoogte beschikbaar)
     - Als grainDirection en stuk.grain: niet roteren
     - Anders: probeer ook geroteerd
4. Herhaal met verschillende sorteervolgordes (iteraties)
5. Behoud beste oplossing (hoogste efficiency)

**Output:**
```javascript
{
  success: true,
  sheets: [
    {
      stockId: 1,
      stockLength: 2440,
      stockWidth: 1220,
      parts: [
        { 
          id: 1, 
          partId: 1,
          name: "Zijwand", 
          length: 800, 
          width: 400, 
          x: 0, 
          y: 0,
          rotated: false
        }
      ],
      wasteArea: 45000,  // mm²
      efficiency: 94.7
    }
  ],
  totalWasteArea: 310000,
  totalEfficiency: 94.7,
  unplacedParts: []
}
```

## 2. PDF Export Specificatie

### 2.1 Pagina Layout (A4 Portrait)

```
┌──────────────────────────────────────────┐
│  [Logo]  CutList Optimizer    Datum: ... │  ← Header (20mm)
│          3BM Bouwkunde        Project:   │
├──────────────────────────────────────────┤
│                                          │
│  Plaat 1 van 2                          │
│  Multiplex 18mm • 2440 × 1220 mm        │
│  Efficiëntie: 94.7%                     │
│                                          │
│  ◄─────────── 2440 mm ───────────►      │
│  ┌─────────────────────────────────┐    │
│ ▲│ ①      │ ②      │ ③            │    │
│ ││800×400 │800×400 │800×400       │    │
│1220├────────┼────────┼──────────────┤    │
│mm ││ ④      │ ⑤      │ ⑥            │    │
│ ││800×400 │760×500 │800×520       │    │
│ ▼│        │        │              │    │
│  └─────────────────────────────────┘    │
│  Zaagsnede: 3 mm                        │
│                                          │
├──────────────────────────────────────────┤
│  STUKLIJST                              │
│  ┌────┬────────────┬───────┬───────┬───┐│
│  │ Nr │ Onderdeel  │ L(mm) │ B(mm) │ N ││
│  ├────┼────────────┼───────┼───────┼───┤│
│  │ 1  │ Zijwand L  │  800  │  400  │ ● ││
│  │ 2  │ Zijwand L  │  800  │  400  │ ● ││
│  │ ...│            │       │       │   ││
│  └────┴────────────┴───────┴───────┴───┘│
├──────────────────────────────────────────┤
│  CutList Optimizer • 3BM      Pag 1/2   │  ← Footer (10mm)
└──────────────────────────────────────────┘
```

### 2.2 Kleuren in PDF

- Stukken: #E5E7EB (grijs)
- Nummer badges: #350E35 (violet)
- Lijnen/maatvoering: #6B7280 (gray-500)
- Header accent: #44B6A8 (verdigris)

## 3. CSV Import Format

```csv
naam,lengte,breedte,aantal,nerf
Zijwand L,800,400,2,ja
Zijwand R,800,400,2,ja
Bodem,760,500,1,nee
```

**Parsing regels:**
- Eerste rij = headers (case-insensitive)
- Separator: komma of puntkomma
- Nerf: "ja"/"nee" of "true"/"false" of "1"/"0"
- Breedte optioneel voor 1D modus

## 4. Data Model

### 4.1 App State

```typescript
interface AppState {
  mode: '1d' | '2d';
  settings: {
    kerf: number;          // mm
    grainDirection: boolean;
    maxIterations: number;
  };
  stock: StockItem[];
  parts: PartItem[];
  results: OptimizationResult | null;
}

interface StockItem {
  id: number;
  name: string;
  length: number;
  width?: number;  // only for 2D
  qty: number;
  material?: string;
}

interface PartItem {
  id: number;
  name: string;
  length: number;
  width?: number;  // only for 2D
  qty: number;
  grain?: boolean; // only for 2D
}
```

## 5. Component Hiërarchie

```
App
├── Header
│   └── Logo, Titel, Import/Export buttons
├── Sidebar
│   ├── ModeToggle (2D/1D)
│   ├── SettingsPanel
│   │   ├── KerfInput
│   │   ├── GrainToggle (2D only)
│   │   └── IterationsSlider
│   ├── StockList
│   │   └── StockCard (per item)
│   ├── PartsList
│   │   └── PartsTable
│   └── CalculateButton
└── ResultsArea
    ├── StatsBar
    ├── SheetNavigation
    ├── CuttingDiagram
    │   ├── DimensionLabels
    │   └── PartRectangles
    ├── PartsTable
    └── ExportBar
```

## 6. Events & Actions

| Action | Trigger | Effect |
|--------|---------|--------|
| SET_MODE | Tab click | Switch 1D/2D, clear results |
| UPDATE_SETTINGS | Input change | Update kerf/iterations/grain |
| ADD_STOCK | Button click | Add empty stock item |
| UPDATE_STOCK | Input change | Update stock item |
| DELETE_STOCK | Button click | Remove stock item |
| ADD_PART | Button click | Add empty part |
| UPDATE_PART | Input change | Update part |
| DELETE_PART | Button click | Remove part |
| CALCULATE | Button click | Run optimization algorithm |
| EXPORT_PDF | Button click | Generate and download PDF |
| EXPORT_CSV | Button click | Generate and download CSV |
| IMPORT_CSV | File select | Parse CSV and populate parts |
