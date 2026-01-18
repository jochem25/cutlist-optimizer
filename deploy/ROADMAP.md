# CutList Optimizer v2.0 - Roadmap

## Huidige Status: v1.2 ✅ LIVE

**URL:** http://46.224.215.142

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
| Docker + Hetzner deployment | ✅ |
| Slider 1-10 optimalisatie | ✅ |
| Frees kerf instelling | ✅ |
| Complexe vormen (boundary/holes) | ✅ |
| Virtuele voorraad uit gaten | ✅ |
| Multi-plaat view | ✅ |
| Zoom controls | ✅ |
| **Drag & drop editor** | ✅ |
| **Parkeerplaats voor onderdelen** | ✅ |
| **Undo functie** | ✅ |

---

## Roadmap v2.0

### Fase 1: Quick Wins ✅ DONE
| Feature | Status |
|---------|--------|
| Slider 1-10 | ✅ |
| Frees kerf instelling | ✅ |

### Fase 2: UI Verbeteringen ✅ DONE
| Feature | Status |
|---------|--------|
| Multi-plaat view | ✅ |
| Zoom controls | ✅ |
| Fullscreen mode | 🔲 (later) |

### Fase 3: Handmatig Bewerken ✅ DONE
| Feature | Status |
|---------|--------|
| Drag & drop stukken | ✅ |
| Stuk verplaatsen tussen platen | ✅ |
| Parkeerplaats | ✅ |
| Undo | ✅ |
| Collision detection | 🔲 |
| Snap to grid/edge | 🔲 |

### Fase 4: Gaten & Nesting (gedeeltelijk ✅)
| Feature | Status | Beschrijving |
|---------|--------|--------------|
| Virtuele voorraad uit gaten | ✅ | Rechthoekige gaten → herbruikbaar |
| Frees vs zaag kerf | ✅ | Aparte kerf instellingen |
| UI voor gaten in voorraad | 🔲 | Handmatig gaten toevoegen |
| Nesting algoritme | 🔲 | Gaten vullen met kleinere stukken |

### Fase 5: Revit Integratie (gedeeltelijk ✅)
| Feature | Status | Beschrijving |
|---------|--------|--------------|
| CSV import boundary/holes | ✅ | Complexe polygonen parsen |
| Visualisatie polygonen | ✅ | SVG rendering in UI + PDF |
| pyRevit export script | 🔲 | One-click export vanuit Revit |

---

## Openstaande Features

### Prioriteit Hoog
| Feature | Complexiteit | Beschrijving |
|---------|--------------|--------------|
| **Collision detection** | ⭐⭐⭐ | Voorkom overlap bij drag & drop |
| **pyRevit export button** | ⭐⭐⭐ | Script voor Revit selectie → CSV |
| **PDF huisstijl template** | ⭐⭐ | 3BM branding in exports |

### Prioriteit Medium
| Feature | Complexiteit | Beschrijving |
|---------|--------------|--------------|
| Snap to grid/edge | ⭐⭐⭐ | Magnetische uitlijning |
| Nesting in gaten | ⭐⭐⭐⭐⭐ | Kleine stukken in grote gaten |
| Handmatig gaten toevoegen | ⭐⭐⭐ | UI voor gaten in voorraad |
| Fullscreen diagram mode | ⭐⭐ | Maximaliseer weergave |

### Prioriteit Laag
| Feature | Complexiteit | Beschrijving |
|---------|--------------|--------------|
| Redo functie | ⭐⭐ | Undo ongedaan maken |
| Keyboard shortcuts | ⭐⭐ | R=rotate, Del=park, etc. |
| Touch/mobile support | ⭐⭐⭐ | Tablet-vriendelijk |
| Donkere modus | ⭐⭐ | Dark theme |

---

## Technische Notities

### Collision Detection Aanpak
```javascript
// AABB (Axis-Aligned Bounding Box) collision
function checkCollision(part1, part2, kerf) {
  return !(part1.x + part1.length + kerf <= part2.x ||
           part2.x + part2.length + kerf <= part1.x ||
           part1.y + part1.width + kerf <= part2.y ||
           part2.y + part2.width + kerf <= part1.y)
}
```

### pyRevit Export
Locatie: `D:\pyRevit\3BM.extension\3BM.tab\Tools.panel\CutList Export.pushbutton\`
Status: Script aangemaakt, moet nog getest worden in Revit

### CSV Formaat v2
```csv
[PARTS]
id,name,stockType,length,width,quantity,grain,boundary,holes
P1,Naam,Type,1440,760,1,false,"x1,y1;x2,y2;...","CIRCLE:cx,cy;d|POLY:x1,y1;..."
```
