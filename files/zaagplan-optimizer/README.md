# Zaagplan Optimizer v2.0

Optimaliseer zaagplannen voor 1D (latten/balken) en 2D (platen) materialen.

## 🚀 Nieuwe Features v2.0

- **Meerdere algoritmes** via dropdown selector
- **OR-Tools integratie** voor optimale 1D resultaten
- **Python backend** voor zware berekeningen
- **Uitgebreide help** met library documentatie

## 📁 Projectstructuur

```
zaagplan-optimizer/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── optimizer_1d.py      # 1D optimalisatie algoritmes
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── AlgorithmSelector.jsx  # Algoritme dropdown
│   ├── HelpModal.jsx          # Help/documentatie modal
│   └── INTEGRATION_GUIDE.jsx  # Hoe te integreren in App.jsx
│
└── README.md
```

## 🔧 Installatie

### Frontend (bestaand project)

1. Kopieer `AlgorithmSelector.jsx` en `HelpModal.jsx` naar `src/components/`

2. Volg de instructies in `INTEGRATION_GUIDE.jsx` om de componenten te integreren

3. Update de titel in je App.jsx naar "Zaagplan Optimizer"

### Backend (nieuw)

```bash
# Ga naar backend folder
cd backend

# Maak virtual environment
python -m venv venv

# Activeer (Windows)
venv\Scripts\activate

# Activeer (Linux/Mac)
source venv/bin/activate

# Installeer dependencies
pip install -r requirements.txt

# Start server
python main.py
```

De API draait nu op `http://localhost:8000`

### Backend op Hetzner VPS

```bash
# SSH naar server
ssh root@46.224.215.142

# Clone of upload backend folder
cd /opt/zaagplan-optimizer

# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start met systemd (voor production)
# Zie systemd service file hieronder
```

**systemd service (`/etc/systemd/system/zaagplan-api.service`):**

```ini
[Unit]
Description=Zaagplan Optimizer API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/zaagplan-optimizer/backend
Environment="PATH=/opt/zaagplan-optimizer/backend/venv/bin"
ExecStart=/opt/zaagplan-optimizer/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable en start
sudo systemctl enable zaagplan-api
sudo systemctl start zaagplan-api
```

## 🧮 Algoritmes

### 1D (Latten/Balken)

| Algoritme | Beschrijving | Snelheid | Kwaliteit |
|-----------|--------------|----------|-----------|
| **Hybrid** | Grote stukken eerst, kleine in reststukken | ⚡⚡ | ⭐⭐⭐⭐ |
| **OR-Tools Optimaal** | Exacte oplossing (Column Generation) | ⚡ | ⭐⭐⭐⭐⭐ |
| **FFD** | First Fit Decreasing (greedy) | ⚡⚡⚡ | ⭐⭐⭐ |

### 2D (Platen)

| Algoritme | Beschrijving | Status |
|-----------|--------------|--------|
| **MaxRects** | Rechthoek bin-packing | ✅ Beschikbaar |
| **MaxRects Multi-Start** | Meerdere pogingen, beste bewaren | ✅ Beschikbaar |
| **NFP Nesting** | Irreguliere vormen | 🚧 Planned |

## 📚 Libraries

### Frontend
- React 18
- Vite
- Tailwind CSS
- maxrects-packer

### Backend
- FastAPI
- Google OR-Tools
- Uvicorn
- Pydantic

### Geplanned (2D Irregular)
- WasteOptimiser
- libnfporb (NFP)
- Shapely

## 🔌 API Endpoints

```
GET  /                    # Health check
GET  /algorithms          # Lijst beschikbare algoritmes
POST /optimize/1d         # 1D optimalisatie
POST /optimize/2d         # 2D optimalisatie (planned)
```

### Voorbeeld API call

```bash
curl -X POST http://localhost:8000/optimize/1d \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      {"id": "A", "length": 1200, "quantity": 3},
      {"id": "B", "length": 800, "quantity": 5}
    ],
    "stocks": [
      {"id": "lat_4000", "length": 4000},
      {"id": "lat_3000", "length": 3000}
    ],
    "kerf": 3,
    "algorithm": "hybrid"
  }'
```

## 🎨 Huisstijl

De tool gebruikt de 3BM Bouwkunde huisstijl:

| Kleur | HEX | Gebruik |
|-------|-----|---------|
| Magic Violet | #350E35 | Headers, primair |
| Verdigris | #44B6A8 | Accenten, success |
| Friendly Yellow | #EFBD75 | Warnings |
| Flaming Peach | #DB4C40 | Errors |

Font: Gotham (bold/medium/book)

## 📞 Contact

**3BM Bouwkunde** - Ingenieurs van oplossingen

---

*Versie 2.0 - Januari 2025*
