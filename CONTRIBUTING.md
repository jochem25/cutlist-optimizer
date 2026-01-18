# Contributing to Zaagplan Optimizer

Bedankt voor je interesse in het bijdragen aan de Zaagplan Optimizer! 🎉

## 🚀 Hoe kan ik bijdragen?

### Bug Reports
- Check eerst of de bug al gemeld is in [Issues](https://github.com/OpenAEC-Foundation/cutlist-optimizer/issues)
- Maak een nieuwe issue met:
  - Duidelijke titel
  - Stappen om te reproduceren
  - Verwacht vs. daadwerkelijk gedrag
  - Screenshots indien relevant

### Feature Requests
- Open een issue met label `enhancement`
- Beschrijf de feature en waarom deze nuttig is
- Geef voorbeelden van gebruik

### Code Contributions

#### 1. Fork & Clone
```bash
# Fork via GitHub UI, dan:
git clone https://github.com/JOUW-USERNAME/cutlist-optimizer.git
cd cutlist-optimizer
git remote add upstream https://github.com/OpenAEC-Foundation/cutlist-optimizer.git
```

#### 2. Branch maken
```bash
git checkout -b feature/mijn-feature
# of
git checkout -b fix/bug-beschrijving
```

#### 3. Development setup
```bash
# Frontend
npm install
npm run dev

# Backend (optioneel)
cd backend
pip install -r requirements.txt
python main.py
```

#### 4. Code schrijven
- Volg de bestaande code style
- Voeg comments toe waar nodig
- Test je wijzigingen

#### 5. Commit & Push
```bash
git add .
git commit -m "Add: beschrijving van wijziging"
git push origin feature/mijn-feature
```

#### 6. Pull Request
- Ga naar GitHub en maak een Pull Request
- Beschrijf je wijzigingen
- Link naar relevante issues

## 📝 Code Style

### JavaScript/React
- Functionele components met hooks
- Tailwind CSS voor styling
- Beschrijvende variabele namen

### Python
- PEP 8 style guide
- Type hints waar mogelijk
- Docstrings voor functies

## 🏷️ Commit Messages

Format: `Type: Beschrijving`

| Type | Gebruik |
|------|---------|
| `Add` | Nieuwe feature |
| `Fix` | Bug fix |
| `Update` | Verbetering bestaande code |
| `Remove` | Code/feature verwijderd |
| `Refactor` | Code restructurering |
| `Docs` | Documentatie |

Voorbeelden:
```
Add: CSV export functionaliteit
Fix: Drag & drop op mobile devices
Update: Optimalisatie algoritme performance
Docs: API documentatie toegevoegd
```

## 🔀 Branch Naming

- `feature/beschrijving` - Nieuwe features
- `fix/beschrijving` - Bug fixes
- `docs/beschrijving` - Documentatie
- `refactor/beschrijving` - Code refactoring

## ✅ Pull Request Checklist

- [ ] Code werkt lokaal
- [ ] Geen console errors
- [ ] Commit messages volgen conventie
- [ ] README/docs bijgewerkt indien nodig
- [ ] Geen gevoelige data (API keys, wachtwoorden)

## 🤝 Code Review

Pull Requests worden gereviewd door maintainers. We letten op:
- Functionaliteit
- Code kwaliteit
- Performance
- Consistentie met bestaande code

## 📞 Contact

Vragen? Open een issue of neem contact op via:
- GitHub Discussions
- [OpenAEC Website](https://openaec.org)

---

Bedankt voor je bijdrage! 🙏
