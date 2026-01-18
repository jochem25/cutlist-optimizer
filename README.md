# Zaagplan Optimizer

> Optimaliseer zaagplannen voor 1D (latten/balken) en 2D (platen) materialen met minimaal afval.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![Python](https://img.shields.io/badge/Python-3.11-3776ab)

<p align="center">
  <img src="docs/screenshot.png" alt="Zaagplan Optimizer Screenshot" width="800">
</p>

## ✨ Features

- **1D Optimalisatie** - Latten, balken, buizen, profielen
- **2D Optimalisatie** - Platen, panelen, plaatmateriaal
- **Smart Split** - Automatisch splitsen van te lange onderdelen
- **Drag & Drop Editor** - Handmatig finetunen van resultaten
- **CSV Import/Export** - Integratie met Excel, Revit, etc.
- **PDF Export** - Zaagplannen voor de werkplaats
- **Meerdere algoritmes** - Hybrid, FFD, OR-Tools

## 🚀 Quick Start

### Online Demo
👉 [zaagplan.openaec.org](http://46.224.215.142) (coming soon)

### Lokaal draaien

```bash
# Clone repository
git clone https://github.com/OpenAEC-Foundation/cutlist-optimizer.git
cd cutlist-optimizer

# Frontend starten
npm install
npm run dev

# Backend starten (optioneel, voor OR-Tools)
cd backend
pip install -r requirements.txt
python main.py
```

Open [http://localhost:5173](http://localhost:5173)

## 🐳 Docker Deployment

```bash
docker compose up -d
```

App draait op `http://localhost:80`

## 📖 Documentatie

| Document | Beschrijving |
|----------|--------------|
| [Gebruikershandleiding](docs/USER_GUIDE.md) | Hoe de tool te gebruiken |
| [Algoritmes](docs/ALGORITHMS.md) | Uitleg van de optimalisatie-algoritmes |
| [API Documentatie](docs/API.md) | Backend REST API |
| [Contributing](CONTRIBUTING.md) | Hoe bij te dragen |

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- maxrects-packer (2D bin packing)
- jsPDF (PDF export)

### Backend
- FastAPI (Python)
- Google OR-Tools (optimalisatie)
- Docker + Nginx

## 📊 Algoritmes

| Algoritme | Type | Snelheid | Kwaliteit |
|-----------|------|----------|-----------|
| Hybrid | 1D | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| FFD | 1D | ⚡⚡⚡⚡ | ⭐⭐⭐ |
| OR-Tools Optimal | 1D | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| MaxRects | 2D | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ |

## 🤝 Contributing

Bijdragen zijn welkom! Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor richtlijnen.

```bash
# Fork de repository
# Maak een feature branch
git checkout -b feature/mijn-feature

# Commit changes
git commit -m "Add: mijn nieuwe feature"

# Push en maak Pull Request
git push origin feature/mijn-feature
```

## 📝 License

MIT License - Zie [LICENSE](LICENSE) voor details.

## 👥 Credits

- **Jochem Bosman** - Concept, Architectuur & Product Owner
- **Claude (Anthropic)** - AI Development Partner

---

<p align="center">
  <strong>OpenAEC Foundation</strong><br>
  Open Source Tools voor Architecture, Engineering & Construction
</p>
