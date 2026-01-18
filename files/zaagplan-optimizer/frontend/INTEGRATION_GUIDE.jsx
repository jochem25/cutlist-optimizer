/**
 * INTEGRATIE INSTRUCTIES
 * ======================
 * 
 * Voeg deze wijzigingen toe aan je bestaande App.jsx
 */

// ============ IMPORTS (bovenaan App.jsx toevoegen) ============

import AlgorithmSelector from './components/AlgorithmSelector'
import HelpModal from './components/HelpModal'

// ============ STATE (in App component toevoegen) ============

const [algorithm, setAlgorithm] = useState('hybrid')
const [backendAvailable, setBackendAvailable] = useState(false)
const [showHelp, setShowHelp] = useState(false)

// ============ BACKEND CHECK (in useEffect toevoegen) ============

useEffect(() => {
  // Check of backend beschikbaar is
  fetch('http://localhost:8000/')
    .then(res => res.json())
    .then(data => {
      setBackendAvailable(true)
      console.log('Backend connected:', data)
    })
    .catch(() => {
      setBackendAvailable(false)
      console.log('Backend not available, using frontend-only mode')
    })
}, [])

// ============ OPTIMIZE FUNCTIE AANPASSEN ============

const handleOptimize = async () => {
  // Check of we backend moeten gebruiken
  const useBackend = backendAvailable && 
    (algorithm === 'ortools_optimal' || algorithm === 'ortools_fast')
  
  if (useBackend && mode === '1d') {
    // Backend API call voor 1D
    try {
      const response = await fetch('http://localhost:8000/optimize/1d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: parts.map(p => ({
            id: p.id || `part_${p.length}`,
            length: p.length,
            quantity: p.quantity || 1,
            label: p.label || `${p.length}mm`
          })),
          stocks: stocks.map(s => ({
            id: s.id || `stock_${s.length}`,
            length: s.length,
            quantity: s.quantity || -1
          })),
          kerf: bladeThickness,
          algorithm: algorithm
        })
      })
      
      const result = await response.json()
      
      // Converteer backend result naar frontend format
      const convertedResults = result.plans.map((plan, idx) => ({
        width: plan.stock_length,
        height: 1, // 1D mode
        rects: plan.cuts.map((cut, cutIdx) => ({
          x: plan.cuts.slice(0, cutIdx).reduce((sum, c) => sum + c.length + bladeThickness, 0),
          y: 0,
          width: cut.length,
          height: 1,
          id: cut.id
        })),
        waste: plan.waste
      }))
      
      setResults(convertedResults)
      setStats({
        totalStocks: result.total_stocks_used,
        totalWaste: result.total_waste,
        wastePercentage: result.waste_percentage,
        algorithm: result.algorithm,
        computationTime: result.computation_time_ms
      })
      
    } catch (error) {
      console.error('Backend error:', error)
      alert('Backend fout. Fallback naar frontend algoritme.')
      // Fallback naar frontend
      runFrontendOptimization()
    }
  } else {
    // Gebruik bestaande frontend optimalisatie
    runFrontendOptimization()
  }
}

// ============ JSX TOEVOEGEN (in het formulier) ============

{/* Algoritme selector - voeg toe naast de Mode toggle */}
<div className="flex gap-4 items-end">
  <div className="flex-1">
    <AlgorithmSelector
      mode={mode}
      value={algorithm}
      onChange={setAlgorithm}
      backendAvailable={backendAvailable}
    />
  </div>
  
  {/* Backend status indicator */}
  <div className="flex items-center gap-2 text-sm">
    <span className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
    <span className="text-gray-600">
      {backendAvailable ? 'Backend actief' : 'Frontend only'}
    </span>
  </div>
</div>

{/* Help knop - voeg toe in de header */}
<button
  onClick={() => setShowHelp(true)}
  className="text-gray-600 hover:text-gray-800"
  title="Help"
>
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
</button>

{/* Help Modal - voeg toe onderaan voor </div> */}
<HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

{/* ============ TITLE AANPASSEN ============ */}

{/* Wijzig de titel van "CutList Optimizer" naar "Zaagplan Optimizer" */}
<h1 className="text-2xl font-bold text-purple-900">
  Zaagplan Optimizer
</h1>
<p className="text-gray-600">
  Optimaliseer je zaagplannen - 1D latten & 2D platen
</p>
