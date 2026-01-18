# Mockup Referentie

De volledige interactieve mockup is beschikbaar in het Claude.ai gesprek waarin dit project is gestart.

## Mockup Versies

1. **v1** - Eerste versie (donker thema) - verworpen
2. **v2** - 3BM huisstijl versie met licentiemodel
3. **v3** - Finale versie met:
   - Grijze zaagstukken
   - Genummerde stukken met badges
   - Maatvoering op zaagplan
   - Stuklijst tabel (niet zaagsneden)
   - Zaagblad dikte instelling

## Om de mockup te bekijken

1. Open de mockup JSX in een React playground (bijv. CodeSandbox)
2. Of implementeer direct in dit project met `npm run dev`

## Key Design Beslissingen

### Kleuren
- Alle zaagstukken zijn grijs (#E5E7EB)
- Nummer badges zijn paars (#350E35)
- Restmateriaal is lichtgrijs met stippellijn

### Maatvoering
- Horizontale maat boven het diagram
- Verticale maat links van het diagram
- Zaagsnede dikte onder het diagram

### Tabel
- Toont STUKKEN, niet zaagsneden
- Kolommen: Nr., Onderdeel, Lengte, Breedte, Nerf
- Gegroepeerd per plaat/balk

## Component Extractie

Bij implementatie, splits de mockup in:
- `CuttingDiagram.jsx` - Het visuele zaagplan
- `PartsTable.jsx` - De stuklijst tabel  
- `PdfPreview.jsx` - PDF preview modal
- `SettingsPanel.jsx` - Zaagblad dikte, iteraties, etc.
