import { useState, useEffect } from 'react'
import Header from './components/Header'
import SettingsPanel from './components/SettingsPanel'
import StockList from './components/StockList'
import PartsList from './components/PartsList'
import CuttingDiagram from './components/CuttingDiagram'
import PartsTable from './components/PartsTable'
import HelpModal from './components/HelpModal'
import { optimize1D } from './algorithms/cutting1D'
import { optimize1DBackend, checkBackendStatus } from './utils/api'
import { optimize2D } from './algorithms/cutting2D'
import { exportToPDF } from './utils/pdfExport'

/**
 * CutList Optimizer - Main App Component
 * Web-based tool voor het optimaliseren van zaagplannen
 */

// Default data
const default2DStock = [
  { id: 1, name: 'Multiplex 18mm', length: 2440, width: 1220, quantity: 3 },
  { id: 2, name: 'MDF 12mm', length: 2440, width: 1220, quantity: 2 },
  { id: 3, name: 'Multiplex 18mm', length: 800, width: 400, quantity: 2 },
  { id: 4, name: 'Multiplex 18mm', length: 740, width: 1200, quantity: 1 }
]

const default2DParts = [
  { id: 1, name: 'Zijwand L', length: 800, width: 400, quantity: 2, grain: true, stockType: 'Multiplex 18mm' },
  { id: 2, name: 'Zijwand R', length: 800, width: 400, quantity: 2, grain: true, stockType: 'Multiplex 18mm' },
  { id: 3, name: 'Bodem', length: 760, width: 500, quantity: 1, grain: false, stockType: 'Multiplex 18mm' },
  { id: 4, name: 'Bovenkant', length: 800, width: 520, quantity: 1, grain: true, stockType: 'Multiplex 18mm' },
  { id: 5, name: 'Plank', length: 740, width: 380, quantity: 4, grain: false, stockType: 'Multiplex 18mm' },
  { id: 6, name: 'Achterwand', length: 780, width: 600, quantity: 1, grain: false, stockType: 'MDF 12mm' }
]

const default1DStock = [
  { id: 1, name: 'KVH 60x120', length: 5000, width: null, quantity: 10 },
  { id: 2, name: 'Lat 40x60', length: 4000, width: null, quantity: 20 },
  { id: 3, name: 'Plint 25x140', length: 2440, width: null, quantity: 3 },
  { id: 4, name: 'Plint 25x140', length: 3050, width: null, quantity: 4 }
]

const default1DParts = [
  { id: 1, name: 'Stijl', length: 2400, width: null, quantity: 8, grain: false, stockType: 'KVH 60x120' },
  { id: 2, name: 'Regel boven', length: 980, width: null, quantity: 4, grain: false, stockType: 'Lat 40x60' },
  { id: 3, name: 'Regel onder', length: 980, width: null, quantity: 4, grain: false, stockType: 'Lat 40x60' },
  { id: 4, name: 'Tussenstijl', length: 1100, width: null, quantity: 6, grain: false, stockType: 'Lat 40x60' },
  { id: 5, name: 'Ligger', length: 3200, width: null, quantity: 3, grain: false, stockType: 'KVH 60x120' }
]

// LocalStorage key
const STORAGE_KEY = 'cutlist-optimizer-state'

// Mapping van optimalisatie level (1-10) naar iteraties
function levelToIterations(level) {
  // 1=100, 5=5000, 10=50000 (exponentieel)
  const base = 100
  const factor = Math.pow(50000 / 100, 1 / 9) // ~1.93
  return Math.round(base * Math.pow(factor, level - 1))
}

// Load state from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      // Migratie: oude maxIterations naar nieuwe optimizationLevel
      if (state.maxIterations && !state.optimizationLevel) {
        // Zoek dichtstbijzijnde level
        for (let l = 1; l <= 10; l++) {
          if (levelToIterations(l) >= state.maxIterations) {
            state.optimizationLevel = l
            break
          }
        }
        if (!state.optimizationLevel) state.optimizationLevel = 5
      }
      return state
    }
  } catch (err) {
    console.error('Error loading state:', err)
  }
  return null
}

function App() {
  // Load saved state or use defaults
  const savedState = loadState()

  // Mode: '2d' voor plaatmateriaal, '1d' voor balken/latten
  const [mode, setMode] = useState(savedState?.mode || '2d')

  // Settings
  const [bladeThickness, setBladeThickness] = useState(savedState?.bladeThickness || 3)
  const [routerThickness, setRouterThickness] = useState(savedState?.routerThickness || 6)
  const [optimizationLevel, setOptimizationLevel] = useState(savedState?.optimizationLevel || 5)
  const [grainDirection, setGrainDirection] = useState(savedState?.grainDirection ?? true)
  const [maxSplitParts, setMaxSplitParts] = useState(savedState?.maxSplitParts ?? 2)
  const [jointAllowance, setJointAllowance] = useState(savedState?.jointAllowance ?? 0)
  const [algorithm, setAlgorithm] = useState(savedState?.algorithm || 'hybrid')

  // Stock & Parts - load from saved state or use defaults
  const [stock, setStock] = useState(savedState?.stock || default2DStock)
  const [parts, setParts] = useState(savedState?.parts || default2DParts)

  // Results
  const [results, setResults] = useState(null)
  const [selectedSheet, setSelectedSheet] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)

  // Help modal
  const [showHelp, setShowHelp] = useState(false)

  // Save state to localStorage when it changes
  useEffect(() => {
    const state = {
      mode,
      bladeThickness,
      routerThickness,
      optimizationLevel,
      grainDirection,
      maxSplitParts,
      jointAllowance,
      algorithm,
      stock,
      parts
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.error('Error saving state:', err)
    }
  }, [mode, bladeThickness, routerThickness, optimizationLevel, grainDirection,
      maxSplitParts,
      jointAllowance, algorithm, stock, parts])

  // Calculate cutting plan
  const handleCalculate = async () => {
    if (stock.length === 0 || parts.length === 0) {
      alert('Voeg eerst voorraad en onderdelen toe.')
      return
    }

    setIsCalculating(true)
    setResults(null)

    const maxIterations = levelToIterations(optimizationLevel)

    const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0)
    const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0)
    const complexity = totalParts * totalStock
    
    const baseDelay = Math.min(100 + (maxIterations / 50), 5000)
    const complexityDelay = Math.min(complexity * 10, 5000)
    const totalDelay = Math.min(baseDelay + complexityDelay, 10000)

    let result

    if (mode === '1d') {
      // Check of we de backend moeten gebruiken (OR-Tools of Smart Split)
      const useBackend = algorithm.startsWith('ortools') || algorithm === 'smart_split'
      
      if (useBackend) {
        try {
          result = await optimize1DBackend({
            parts: parts,
            stock: stock,
            kerf: bladeThickness,
            algorithm: algorithm,
            maxSplitParts: maxSplitParts,
            jointAllowance: jointAllowance
          })
          console.log('Backend resultaat:', result.meta)
        } catch (error) {
          console.error('Backend error:', error)
          setIsCalculating(false)
          alert(`Backend fout: ${error.message}\n\nZorg dat de backend draait (start-backend.bat)`)
          return
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500))
        result = optimize1D({
          stock: stock,
          parts: parts,
          kerf: bladeThickness,
          maxSplitParts: maxSplitParts,
          jointAllowance: jointAllowance,
          algorithm: algorithm
        })
      }
    } else {
      const startTime = Date.now()
      
      result = optimize2D({
        stock: stock,
        parts: parts,
        kerf: bladeThickness,
        routerKerf: routerThickness, // Voor toekomstige gaten/sparingen
        grainDirection: grainDirection,
      maxSplitParts,
      jointAllowance,
        maxIterations: maxIterations,
        algorithm: algorithm
      })
      
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, totalDelay - elapsed)
      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay))
      }
    }

    if (!result.success && result.error) {
      alert(result.error)
    }

    setResults(result)
    setSelectedSheet(0)
    setIsCalculating(false)
  }

  // Save configuratie als CSV
  const handleSave = () => {
    const lines = []
    
    // Settings sectie
    lines.push('[SETTINGS]')
    lines.push('mode,bladeKerf,routerKerf,grainDirection,maxSplitParts,jointAllowance,algorithm,optimizationLevel')
    lines.push(`${mode},${bladeThickness},${routerThickness},${grainDirection},${maxSplitParts},${jointAllowance},${algorithm},${optimizationLevel}`)
    lines.push('')
    
    // Stock sectie
    lines.push('[STOCK]')
    if (mode === '2d') {
      lines.push('name,length,width,quantity')
      stock.forEach(s => {
        lines.push(`${s.name},${s.length},${s.width},${s.quantity}`)
      })
    } else {
      lines.push('name,length,quantity')
      stock.forEach(s => {
        lines.push(`${s.name},${s.length},${s.quantity}`)
      })
    }
    lines.push('')
    
    // Parts sectie
    lines.push('[PARTS]')
    if (mode === '2d') {
      lines.push('name,length,width,quantity,grain,stockType')
      parts.forEach(p => {
        lines.push(`${p.name},${p.length},${p.width},${p.quantity},${p.grain},${p.stockType}`)
      })
    } else {
      lines.push('name,length,quantity,stockType')
      parts.forEach(p => {
        lines.push(`${p.name},${p.length},${p.quantity},${p.stockType}`)
      })
    }

    // Download als bestand
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `cutlist_${timestamp}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Parse CSV line met support voor quoted values (voor boundary/holes)
  const parseCSVLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  // Open configuratie uit CSV
  const handleOpen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target.result
          const lines = content.split('\n').map(l => l.trim()).filter(l => l)
          
          let currentSection = null
          let newStock = []
          let newParts = []
          let newSettings = {}
          let headers = []

          for (const line of lines) {
            // Detecteer sectie headers
            if (line.startsWith('[SETTINGS]')) {
              currentSection = 'settings'
              headers = []
              continue
            } else if (line.startsWith('[STOCK]')) {
              currentSection = 'stock'
              headers = []
              continue
            } else if (line.startsWith('[PARTS]')) {
              currentSection = 'parts'
              headers = []
              continue
            }

            // Parse data met support voor quoted values
            const values = parseCSVLine(line)
            
            if (headers.length === 0) {
              // Dit is de header rij
              headers = values
              continue
            }

            // Maak object van values
            const obj = {}
            headers.forEach((h, i) => {
              let val = values[i] || ''
              // Type conversie
              if (['length', 'width', 'quantity', 'kerf', 'bladeKerf', 'routerKerf', 'maxIterations', 'optimizationLevel'].includes(h)) {
                val = parseFloat(val) || 0
              } else if (['grain', 'grainDirection'].includes(h)) {
                val = val === 'true'
              }
              // boundary en holes blijven strings
              obj[h] = val
            })

            if (currentSection === 'settings') {
              newSettings = obj
            } else if (currentSection === 'stock') {
              obj.id = newStock.length + 1
              newStock.push(obj)
            } else if (currentSection === 'parts') {
              obj.id = newParts.length + 1
              newParts.push(obj)
            }
          }

          // Pas instellingen toe
          if (newSettings.mode) setMode(newSettings.mode)
          if (newSettings.bladeKerf) setBladeThickness(newSettings.bladeKerf)
          if (newSettings.routerKerf) setRouterThickness(newSettings.routerKerf)
          // Backwards compatibility
          if (newSettings.kerf && !newSettings.bladeKerf) setBladeThickness(newSettings.kerf)
          if (newSettings.grainDirection !== undefined) setGrainDirection(newSettings.grainDirection)
          if (newSettings.algorithm) setAlgorithm(newSettings.algorithm)
          if (newSettings.optimizationLevel) setOptimizationLevel(newSettings.optimizationLevel)
          if (newSettings.maxSplitParts !== undefined) setMaxSplitParts(parseInt(newSettings.maxSplitParts))
          if (newSettings.jointAllowance !== undefined) setJointAllowance(parseFloat(newSettings.jointAllowance))
          // Backwards compatibility voor oude maxIterations
          if (newSettings.maxIterations && !newSettings.optimizationLevel) {
            for (let l = 1; l <= 10; l++) {
              if (levelToIterations(l) >= newSettings.maxIterations) {
                setOptimizationLevel(l)
                break
              }
            }
          }

          // Pas data toe
          if (newStock.length > 0) setStock(newStock)
          if (newParts.length > 0) setParts(newParts)

          // Reset resultaten
          setResults(null)
          setSelectedSheet(0)

          alert(`Configuratie geladen: ${newStock.length} voorraad items, ${newParts.length} onderdelen`)
        } catch (err) {
          console.error('Parse error:', err)
          alert('Fout bij het lezen van het CSV bestand. Controleer het formaat.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Export PDF handler
  const handleExport = () => {
    if (!results) {
      alert('Bereken eerst een zaagplan om te exporteren.')
      return
    }
    
    try {
      exportToPDF({
        mode,
        results,
        stock,
        parts,
        settings: {
          kerf: bladeThickness,
          routerKerf: routerThickness,
          grainDirection,
      maxSplitParts,
      jointAllowance,
          algorithm,
          optimizationLevel
        }
      })
    } catch (err) {
      console.error('PDF export error:', err)
      alert('Fout bij het exporteren naar PDF.')
    }
  }

  // Update stock/parts when mode changes
  const handleModeChange = (newMode) => {
    setMode(newMode)
    setResults(null)
    setSelectedSheet(0)

    if (newMode === '1d') {
      setStock(default1DStock)
      setParts(default1DParts)
    } else {
      setStock(default2DStock)
      setParts(default2DParts)
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <Header 
        onSave={handleSave} 
        onOpen={handleOpen} 
        onExport={handleExport} 
        onHelp={() => setShowHelp(true)} 
      />

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-96 bg-white border-r border-gray-200 flex flex-col min-h-0">
          {/* Settings Panel with Mode Toggle */}
          <SettingsPanel
            mode={mode}
            setMode={handleModeChange}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            bladeThickness={bladeThickness}
            setBladeThickness={setBladeThickness}
            routerThickness={routerThickness}
            setRouterThickness={setRouterThickness}
            optimizationLevel={optimizationLevel}
            setOptimizationLevel={setOptimizationLevel}
            grainDirection={grainDirection}
            setGrainDirection={setGrainDirection}
              maxSplitParts={maxSplitParts}
              setMaxSplitParts={setMaxSplitParts}
              jointAllowance={jointAllowance}
              setJointAllowance={setJointAllowance}
          />

          {/* Stock & Parts Lists - scrollable area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
            <StockList
              mode={mode}
              stock={stock}
              setStock={setStock}
            />

            <PartsList
              mode={mode}
              parts={parts}
              setParts={setParts}
              grainDirection={grainDirection}
              stock={stock}
            />
          </div>

          {/* Calculate Button */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {/* Statistics summary */}
            {results && results.sheets && results.sheets.length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">{mode === '2d' ? 'Platen:' : 'Balken:'}</span>
                    <span className="ml-1 font-semibold text-violet">{results.summary.totalSheets}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Stukken:</span>
                    <span className="ml-1 font-semibold text-violet">{results.summary.totalParts}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Benutting:</span>
                    <span className={`ml-1 font-semibold ${
                      results.summary.avgEfficiency >= 80 ? 'text-verdigris' : 'text-friendly-yellow'
                    }`}>
                      {results.summary.avgEfficiency.toFixed(1)}%
                    </span>
                  </div>
                  {results.summary.unplacedParts > 0 && (
                    <div>
                      <span className="text-gray-500">Niet geplaatst:</span>
                      <span className="ml-1 font-semibold text-flaming-peach">
                        {results.summary.unplacedParts}
                      </span>
                    </div>
                  )}
                </div>
                {/* Copy Log Button */}
                {results.log && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(results.log)
                      alert('Log gekopieerd naar klembord!')
                    }}
                    className="mt-2 w-full py-1.5 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Kopieer debug log
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={isCalculating || stock.length === 0 || parts.length === 0}
              className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isCalculating || stock.length === 0 || parts.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-verdigris text-white hover:bg-verdigris-light'
              }`}
            >
              {isCalculating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Berekenen...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                  Bereken zaagplan
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Results Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cutting Diagram */}
          <CuttingDiagram
            mode={mode}
            results={results}
            setResults={setResults}
            selectedSheet={selectedSheet}
            setSelectedSheet={setSelectedSheet}
            kerf={bladeThickness}
            stock={stock}
          />

          {/* Parts Table */}
          <PartsTable
            mode={mode}
            results={results}
            selectedSheet={selectedSheet}
          />
        </main>
      </div>
    </div>
  )
}

export default App
