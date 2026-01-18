# MCP Tools - Project Instructies voor Claude

**Versie:** 3.0 - 2026-01-14  
**Doel:** Claude maximaal gebruik laten maken van beschikbare MCP servers  
**Importeer dit bestand in elk nieuw project**

---

## ⚠️ KRITISCHE INSTRUCTIES

### BESTAND EDITING - GEBRUIK ALTIJD `replace_in_file`!

**FOUT (herschrijft hele bestand):**
```
❌ write_file("script.py", "...hele nieuwe inhoud...")
```

**GOED (alleen wijziging):**
```
✅ replace_in_file("script.py", "oude_code", "nieuwe_code")
```

**Regel:** Bij ELKE bestandswijziging < 50% van het bestand → gebruik `replace_in_file`

### NOOIT PowerShell/CMD gebruiken als MCP tool bestaat!

**FOUT:**
```
❌ run_powershell("Copy-Item C:/a.txt C:/b.txt")
❌ run_cmd("dir C:/project")
```

**GOED:**
```
✅ copy_file("C:/a.txt", "C:/b.txt")
✅ list_files("C:/project")
```

---

## 🎯 Server Prioriteit

```
┌─────────────────────────────────────────────────────────────┐
│  PRIORITEIT 1: 3BM_Bouwkunde                                │
│  → Bestanden, spreadsheets, advanced search, monitoring     │
├─────────────────────────────────────────────────────────────┤
│  PRIORITEIT 2: ERPNext                                      │
│  → Timesheets, projecten, facturen, klanten, taken          │
├─────────────────────────────────────────────────────────────┤
│  PRIORITEIT 3: PDF Tools                                    │
│  → PDF extractie, manipulatie, generatie                    │
├─────────────────────────────────────────────────────────────┤
│  PRIORITEIT 4: Thunderbird                                  │
│  → Email lezen, drafts aanmaken (NOOIT auto-verzenden)      │
├─────────────────────────────────────────────────────────────┤
│  PRIORITEIT 5: Revit MCP                                    │
│  → BIM model operaties, views, families, kleuren            │
├─────────────────────────────────────────────────────────────┤
│  PRIORITEIT 6: PowerShell/CMD (LAATSTE REDMIDDEL)           │
│  → Alleen als GEEN MCP tool beschikbaar is                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 3BM_Bouwkunde Server (39 tools)

### Bestandsbeheer (12 tools)
| Tool | Gebruik | Voorbeeld |
|------|---------|-----------|
| `list_files` | Directory inhoud | `list_files("Z:/projecten")` |
| `read_file` | Tekstbestanden lezen | `read_file("script.py")` |
| `write_file` | NIEUW bestand aanmaken | `write_file("nieuw.py", content)` |
| `replace_in_file` | **EDIT bestaand bestand** | `replace_in_file("x.py", "oud", "nieuw")` |
| `open_file` | Open in Windows app | `open_file("rapport.xlsx")` |
| `copy_file` | Bestand kopiëren | `copy_file("a.txt", "b.txt")` |
| `move_file` | Bestand verplaatsen | `move_file("a.txt", "archive/")` |
| `delete_file` | Verwijderen | ⚠️ Vraag ALTIJD bevestiging! |
| `file_exists` | Check bestaan | `file_exists("config.json")` |
| `get_file_info` | Metadata ophalen | `get_file_info("data.xlsx")` |
| `tail_file` | Laatste N regels | `tail_file("app.log", 100)` |
| `compare_files` | Vergelijk 2 bestanden | `compare_files("v1.py", "v2.py")` |

### 🆕 Advanced Search (Fase 3) - 4 tools
| Tool | Gebruik | Kracht |
|------|---------|--------|
| `advanced_search` | Multi-pattern + regex search | Zoek meerdere patterns tegelijk! |
| `export_search_to_file` | Export results naar JSON/CSV | Voor analyse in Excel |
| `search_and_replace_advanced` | Bulk refactoring met preview | Preview=True default (safe!) |
| `content_analyzer` | Code statistics, duplicates | 5 analysis types |

**Advanced Search Capabilities:**
```python
# Multi-pattern search
advanced_search("C:/project", ["TODO", "FIXME", "HACK"], file_types=["*.py"])

# Regex patterns
advanced_search("C:/project", [r"def \w+\("], use_regex=True, file_types=["*.py"])

# Safe bulk replace (preview first!)
search_and_replace_advanced(
    "C:/project",
    r"old_func_(\w+)",
    r"new_func_$1",
    use_regex=True,
    preview=True  # ALWAYS preview first!
)

# Code statistics
content_analyzer("C:/project", "code_stats", file_types=["*.py"])

# Find duplicates
content_analyzer("C:/project", "duplicates")
```

**Analysis Types:**
- `"overview"` - File counts, sizes, types
- `"duplicates"` - Find duplicate files (MD5 hash)
- `"large_files"` - Files >10MB
- `"old_files"` - Not modified in 6+ months
- `"code_stats"` - Lines of code, comments, blanks

### Basic Search (3 tools)
| Tool | Gebruik | Voorbeeld |
|------|---------|-----------|
| `find_files` | Zoek op bestandsnaam | `find_files("Z:/", "*.xlsx")` |
| `search_in_files` | Zoek IN bestanden (grep) | `search_in_files("Z:/", "TODO", "*.py")` |
| `directory_tree` | Mapstructuur visualiseren | `directory_tree("Z:/project", depth=3)` |

### Bulk Operaties (2 tools)
| Tool | Gebruik | Let op |
|------|---------|--------|
| `bulk_replace` | Tekst in meerdere bestanden | ⚠️ Default: dry_run=True |
| `compare_directories` | Vergelijk 2 mappen | `compare_directories("source", "runtime")` |

### Directory Tools (3 tools)
| Tool | Gebruik | Voorbeeld |
|------|---------|-----------|
| `create_directory` | Map aanmaken | `create_directory("Z:/nieuwe_map")` |
| `delete_directory` | Map verwijderen | ⚠️ recursive=False default |
| `copy_directory` | Map kopiëren | `copy_directory("src", "backup")` |

### Spreadsheets - xlsx/ods/csv (5 tools)
| Tool | Gebruik | Let op |
|------|---------|--------|
| `list_sheets` | **ALTIJD EERST** - toon tabbladen | `list_sheets("data.ods")` |
| `read_spreadsheet` | Data uitlezen | Geef sheet_name mee! |
| `write_spreadsheet` | Nieuwe spreadsheet | ⚠️ OVERSCHRIJFT bestaande! |
| `update_sheet_in_workbook` | Update 1 sheet, behoud rest | Veilig voor multi-sheet |
| `append_to_sheet` | Rijen toevoegen | Kolommen moeten matchen |

### ZIP/Archief (2 tools)
| Tool | Gebruik |
|------|---------|
| `zip_folder` | Map → ZIP |
| `unzip_file` | ZIP → Map |

### Systeem (3 tools)
| Tool | Gebruik |
|------|---------|
| `get_system_info` | Python versie, packages |
| `is_process_running` | Check process (Revit.exe) |
| `install_package` | pip install |

### Fallback (2 tools) - ALLEEN ALS MCP NIET KAN
| Tool | Wanneer WEL |
|------|-------------|
| `run_powershell` | Windows services, registry, netwerk |
| `run_cmd` | Legacy batch scripts, **NPM/NPX** |

**⚠️ NPM/NPX:** Gebruik ALTIJD `run_cmd`, NOOIT `run_powershell` (npm.ps1 incompatibel)

---

## 📊 Logging & Monitoring (Fase 2)

**Locatie:** `Z:/50_projecten/7_3BM_bouwkunde/_AI_logs/`

### Log Types
```
_AI_logs/
├── errors/      → Exceptions, tracebacks, context
├── operations/  → Tool calls, parameters, results, timing
├── performance/ → Metrics, durations, resource usage
└── debug/       → Retry attempts, detailed state
```

### Features
- ✅ Automatic daily rotation
- ✅ 30-day retention
- ✅ JSON format (easy parsing)
- ✅ Retry logic (3x attempts, exponential backoff)
- ✅ Performance tracking (duration_ms)

### Monitoring
```bash
# Daily health check
python Z:\_AI_logs\log_analyzer.py

# Weekly summary
python Z:\_AI_logs\log_analyzer.py --summary
```

### Logged Operations (5 critical tools)
- `read_file` - 4.1ms avg
- `write_file` - 6.6ms avg
- `copy_file` - 18.3ms avg
- `replace_in_file` - 13.6ms avg
- `move_file` - logged with performance

**📈 Performance Baseline:**
- Success rate: 100%
- Logging overhead: <1ms (negligible)
- Transient failure recovery: ~90%

---

## 💡 Performance & Optimizations

### Memory Optimizations (Implemented 2026-01-14)
**Advanced search tools optimized voor large files:**
- Stream processing (geen full file in memory)
- File size limits (skip >10MB files)
- Streaming hash voor duplicates (4KB chunks)
- Buffer management (max 100 lines context)

**Expected improvements:**
- Memory: -70% to -85% voor search operations
- Peak memory: 200MB → 30MB
- Duplicates: 5GB → 200KB (-99.996%!)

**Best Practices:**
- Advanced search handles files efficiently
- No manual memory management needed
- Safe for large codebases (1000+ files)

---

## 💼 ERPNext Server (27 tools)

**Constraint:** Altijd gefilterd op company "3BM Bouwkunde"

### Timesheets (5 tools)
| Tool | Doel |
|------|------|
| `get_timesheets` | Lijst (filter: employee, project, datum) |
| `get_timesheet_detail` | Volledige timesheet + time_logs |
| `create_timesheet` | Nieuwe timesheet (DRAFT!) |
| `update_timesheet` | Bestaande wijzigen |
| `get_timesheet_summary` | Uren per project |

### Projecten (5 tools)
| Tool | Doel |
|------|------|
| `get_projects` | Projectenlijst |
| `get_project_detail` | Volledige project info |
| `create_project` | Nieuw project aanmaken |
| `update_project` | Project wijzigen |
| `get_project_hours` | Uren per medewerker |

### Taken (4 tools)
| Tool | Doel |
|------|------|
| `get_tasks` | Takenlijst |
| `get_task_detail` | Volledige taak |
| `create_task` | Nieuwe taak |
| `update_task` | Taak wijzigen |

### Klanten (4 tools)
| Tool | Doel |
|------|------|
| `get_customers` | Klantenlijst |
| `get_customer_detail` | Volledige klant info |
| `create_customer` | Nieuwe klant |
| `update_customer` | Klant wijzigen |

### Facturen (4 tools)
| Tool | Doel |
|------|------|
| `get_sales_invoices` | Factuurlijst |
| `get_sales_invoice_detail` | Volledige factuur |
| `get_outstanding_invoices` | Openstaande facturen |
| `get_invoice_summary_by_customer` | Openstaand per klant |

### Master Data (4 tools)
| Tool | Doel |
|------|------|
| `get_companies` | Bedrijvenlijst |
| `get_employees` | Medewerkerslijst |
| `get_activity_types` | Types voor timesheets |
| `test_connection` | Verbinding testen |

**⚠️ NOOIT beschikbaar:** DELETE functies (3BM policy)

---

## 📄 PDF Tools Server (15 tools)

### Extractie (5 tools)
| Tool | Doel |
|------|------|
| `pdf_extract_text` | Tekst uit PDF |
| `pdf_extract_tables` | Tabellen uit PDF |
| `pdf_get_info` | PDF metadata |
| `pdf_search` | Zoek tekst in PDF |
| `pdf_to_markdown` | PDF → Markdown |

### Pagina Manipulatie (4 tools)
| Tool | Doel |
|------|------|
| `pdf_merge` | Meerdere PDFs samenvoegen |
| `pdf_split` | PDF splitsen |
| `pdf_extract_pages` | Specifieke pagina's extracten |
| `pdf_rotate_pages` | Pagina's roteren |

### Editing (3 tools)
| Tool | Doel |
|------|------|
| `pdf_add_watermark` | Watermark toevoegen |
| `pdf_add_stamp` | Stempel (CONCEPT, GOEDGEKEURD) |
| `pdf_set_metadata` | Metadata aanpassen |

### Generatie (3 tools)
| Tool | Doel |
|------|------|
| `pdf_create_simple` | Simpele PDF met tekst |
| `pdf_create_from_images` | PDF van images/scans |
| `pdf_to_images` | PDF → images |

---

## 📧 Thunderbird Server (4 tools)

| Tool | Doel | Let op |
|------|------|--------|
| `list_folders` | Toon alle mailfolders | Start hier |
| `read_emails` | Emails uit folder | limit, search_term |
| `get_email_full` | Volledige email + bijlagen | email_index nodig |
| `create_draft_email` | Concept email | ⚠️ NOOIT auto-verzenden! |

**Ondersteunde accounts:** POP3, IMAP, Exchange (via Owl)

---

## 🏗️ Revit MCP Server (13 tools)

**Vereist:** Revit open met model, pyRevit MCP extension geladen

### Status & Info (2 tools)
| Tool | Doel |
|------|------|
| `get_revit_status` | Check of Revit actief is |
| `get_revit_model_info` | Model metadata |

### Views (4 tools)
| Tool | Doel |
|------|------|
| `list_revit_views` | Alle views in model |
| `get_revit_view` | Export view als image |
| `get_current_view_info` | Actieve view details |
| `get_current_view_elements` | Elementen in actieve view |

### Families (3 tools)
| Tool | Doel |
|------|------|
| `list_families` | Beschikbare families |
| `list_family_categories` | Categorieën |
| `place_family` | Family plaatsen |

### Model (1 tool)
| Tool | Doel |
|------|------|
| `list_levels` | Levels in model |

### Kleuren (3 tools)
| Tool | Doel |
|------|------|
| `color_splash` | Kleur elementen op parameter |
| `clear_colors` | Reset kleuren |
| `list_category_parameters` | Parameters per categorie |

### Code Execution (1 tool)
| Tool | Wanneer |
|------|---------|
| `execute_revit_code` | **Alleen** als andere tools niet volstaan |

**⚠️ execute_revit_code:** Altijd encoding header:
```python
# encoding: utf-8
from pyrevit import revit, DB
...
```

---

## 🔄 Beslisboom: Welke Tool?

```
Vraag: "Zoek alle TODO comments"
└─► Meerdere patterns of regex?
    └─► JA → advanced_search(["TODO", "FIXME"], file_types=["*.py"])
    └─► NEE → search_in_files("folder", "TODO", "*.py")

Vraag: "Bulk rename functions"
└─► Preview eerst?
    └─► JA → search_and_replace_advanced(..., preview=True)
    └─► Check results, dan preview=False

Vraag: "Vind duplicate files"
└─► content_analyzer("folder", "duplicates")

Vraag: "Code statistics"
└─► content_analyzer("folder", "code_stats", file_types=["*.py"])

Vraag: "Wijzig regel 45 in script.py"
└─► Is het < 50% van bestand? 
    └─► JA → replace_in_file()
    └─► NEE → write_file()

Vraag: "Kopieer bestand X naar Y"
└─► Bestaat copy_file MCP tool?
    └─► JA → copy_file()
    └─► NEE → run_powershell() (laatste redmiddel)

Vraag: "Lees Excel bestand"
└─► Is het xlsx/ods/csv?
    └─► JA → list_sheets() EERST, dan read_spreadsheet()
    └─► NEE → read_file()
```

---

## ❌ Anti-Patterns

| FOUT | WAAROM | GOED |
|------|--------|------|
| `search_in_files()` voor regex | Geen regex support | `advanced_search()` met use_regex=True |
| `bulk_replace()` zonder preview | Geen preview mode | `search_and_replace_advanced()` met preview=True |
| `write_file()` voor kleine edit | Overschrijft hele bestand | `replace_in_file()` |
| `run_powershell("copy ...")` | MCP tool bestaat | `copy_file()` |
| `run_powershell` voor npm | npm.ps1 incompatibel | `run_cmd()` |
| `read_file("data.xlsx")` | Binair bestand | `read_spreadsheet()` |
| `read_spreadsheet()` zonder sheet_name | Weet niet welke sheet | `list_sheets()` EERST |
| Email auto-verzenden | Geen controle | `create_draft_email()` |
| Timesheet auto-submit | Financiële consequenties | Altijd DRAFT |
| `write_spreadsheet()` op bestaand | Overschrijft andere sheets | `update_sheet_in_workbook()` |

---

## ✅ Best Practices

### Advanced Search Workflow (Fase 3)
```
1. Gebruik advanced_search() voor:
   - Multiple patterns tegelijk
   - Regex patterns
   - Case-sensitive zoeken
   - Export naar JSON/CSV

2. Gebruik search_and_replace_advanced() voor:
   - Bulk refactoring
   - ALTIJD preview=True eerst
   - Backup=True voor safety

3. Gebruik content_analyzer() voor:
   - Project overview
   - Finding duplicates
   - Code statistics
   - Cleanup candidates (large/old files)
```

### Bestand Editing Workflow
```
1. read_file() → bekijk huidige inhoud
2. Bepaal wijzigingen
3. replace_in_file() → pas toe
4. read_file() → verificeer (optioneel)
```

### Spreadsheet Workflow
```
1. list_sheets() → bekijk beschikbare tabbladen
2. read_spreadsheet(sheet_name="...") → lees data
3. update_sheet_in_workbook() of append_to_sheet() → wijzig
```

### ERPNext Timesheet Workflow
```
1. get_employees() → vind employee ID
2. get_projects() → vind project ID
3. get_activity_types() → vind activity type
4. create_timesheet() → maak DRAFT
5. User reviewt in ERPNext
```

### Email Workflow
```
1. list_folders() → vind juiste folder
2. read_emails() → zoek email
3. get_email_full() → lees volledige inhoud
4. create_draft_email() → maak concept
5. User reviewed en verstuurt ZELF
```

### Monitoring Workflow (Fase 2)
```
1. Check logs bij issues: Z:\_AI_logs/errors/
2. Performance analysis: log_analyzer.py
3. Daily health check: python log_analyzer.py
4. Weekly summary: python log_analyzer.py --summary
```

---

## 🔧 Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| "Tool geeft geen output" | Check timeout, encoding, logs |
| "Advanced search slow" | Files >10MB skipped (optimization) |
| "Memory usage high" | Normal for search, optimized in v3.0 |
| "Spreadsheet lezen faalt" | `list_sheets()` eerst voor juiste naam |
| "ERPNext connection failed" | `test_connection()` → check credentials |
| "Revit MCP niet bereikbaar" | `get_revit_status()` → Revit + pyRevit open? |
| "replace_in_file niet gevonden" | Tekst moet EXACT matchen |
| "PowerShell hangt" | Timeout verhogen of MCP tool gebruiken |
| "NPM commands fail" | Use run_cmd(), NOT run_powershell() |

---

## 📋 Quick Reference Card

```
┌────────────────────────────────────────────────────────────┐
│ BESTANDEN         → 3BM_Bouwkunde                          │
│                     read/write/replace_in_file/copy/move   │
├────────────────────────────────────────────────────────────┤
│ ADVANCED SEARCH   → 3BM_Bouwkunde (NEW in v3.0)           │
│                     advanced_search, content_analyzer      │
├────────────────────────────────────────────────────────────┤
│ SPREADSHEETS      → 3BM_Bouwkunde                          │
│                     list_sheets EERST, dan read/write      │
├────────────────────────────────────────────────────────────┤
│ UREN/PROJECTEN    → ERPNext                                │
│                     timesheets, projects, tasks, invoices  │
├────────────────────────────────────────────────────────────┤
│ PDF               → PDF Tools                              │
│                     extract, merge, split, watermark       │
├────────────────────────────────────────────────────────────┤
│ EMAIL             → Thunderbird                            │
│                     read only, draft only, NOOIT verzenden │
├────────────────────────────────────────────────────────────┤
│ BIM/REVIT         → Revit MCP                              │
│                     views, elements, families, colors      │
├────────────────────────────────────────────────────────────┤
│ LOGGING           → Z:\_AI_logs (NEW in v3.0)              │
│                     errors, operations, performance        │
├────────────────────────────────────────────────────────────┤
│ SYSTEEM           → PowerShell/CMD (LAATSTE REDMIDDEL)     │
│                     alleen als MCP niet kan                │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Totaal Beschikbare Tools: 102

| Server | Aantal | Categorie |
|--------|--------|-----------|
| 3BM_Bouwkunde | **39** | Files, Spreadsheets, Advanced Search, Monitoring |
| ERPNext | 27 | Business Data (CRM, Timesheets, Invoices) |
| PDF Tools | 15 | PDF Manipulation |
| Thunderbird | 4 | Email |
| Revit MCP | 13 | BIM Operations |
| PyRevit Tools | 4 | Revit Workflow Automation |
| **Totaal** | **102** | |

---

## 🆕 Changelog

### Version 3.0 - 2026-01-14
**FASE 3 - Advanced Search Suite:**
- ✅ `advanced_search` - Multi-pattern + regex support
- ✅ `export_search_to_file` - Export naar JSON/CSV
- ✅ `search_and_replace_advanced` - Bulk refactoring met preview
- ✅ `content_analyzer` - Code stats, duplicates, analysis

**FASE 2 - Logging & Monitoring:**
- ✅ Comprehensive logging infrastructure (Z:\_AI_logs)
- ✅ Retry logic (3x, exponential backoff)
- ✅ Performance tracking (<1ms overhead)
- ✅ Log analyzer tool

**Performance Optimizations:**
- ✅ Stream processing voor large files
- ✅ File size limits (>10MB skip)
- ✅ Streaming hash voor duplicates (-99.996% memory!)
- ✅ Buffer management

**Tool Count:** 98 → 102 tools (+4)

### Version 2.0 - 2025-01-10
- Initial comprehensive documentation
- 98 tools across 5 servers
- Basic file, spreadsheet, ERPNext workflows

---

**Maintainer:** 3BM AI Team  
**Laatste update:** 2026-01-14  
**Status:** ✅ Production Ready - v3.0
