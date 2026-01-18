/**
 * SettingsPanel Component
 * Bevat mode toggle, algoritme keuze, zaagblad/frees dikte, iteraties slider en nerf-richting toggle
 */
export default function SettingsPanel({
  mode,
  setMode,
  algorithm,
  setAlgorithm,
  bladeThickness,
  setBladeThickness,
  routerThickness,
  setRouterThickness,
  optimizationLevel,
  setOptimizationLevel,
  grainDirection,
  setGrainDirection,
  maxSplitParts,
  setMaxSplitParts,
  jointAllowance,
  setJointAllowance
}) {
  // Algoritme opties per mode
  const algorithms2D = [
    { 
      id: 'hybrid', 
      name: 'Hybride (aanbevolen)', 
      description: 'Iteratief + Guillotine, kleinste plaat eerst'
    },
    { 
      id: 'maxrects', 
      name: 'MaxRects Packer', 
      description: 'Snelle library, minder controle'
    },
    { 
      id: 'guillotine', 
      name: 'Guillotine Only', 
      description: 'Puur guillotine splits, deterministisch'
    }
  ]

  const algorithms1D = [
    { 
      id: 'smart_split', 
      name: '🎯 Slim Splitsen (aanbevolen)', 
      description: 'Splitst te lange onderdelen, vult gaten optimaal',
      backend: true
    },
    { 
      id: 'hybrid', 
      name: 'Hybride', 
      description: 'Grote stukken eerst, kleine in reststukken',
      backend: false
    },
    { 
      id: 'ffd', 
      name: 'First Fit Decreasing', 
      description: 'Snel, plaatst grote stukken eerst',
      backend: false
    },
    { 
      id: 'ortools_optimal', 
      name: '🔬 OR-Tools Optimaal', 
      description: 'Exacte oplossing via Column Generation (traag)',
      backend: true
    },
    { 
      id: 'ortools_fast', 
      name: '⚡ OR-Tools Snel', 
      description: 'Snelle heuristiek via OR-Tools MIP',
      backend: true
    }
  ]

  const algorithms = mode === '1d' ? algorithms1D : algorithms2D

  // Optimalisatie level labels
  const levelLabels = {
    1: 'Minimaal',
    2: 'Laag',
    3: 'Basis',
    4: 'Normaal',
    5: 'Standaard',
    6: 'Goed',
    7: 'Hoog',
    8: 'Zeer hoog',
    9: 'Intensief',
    10: 'Maximaal'
  }

  // Mapping van level 1-10 naar iteraties (exponentieel)
  const levelToIterations = (level) => {
    // 1=100, 5=5000, 10=50000
    const base = 100
    const factor = Math.pow(50000 / 100, 1 / 9) // ~1.93
    return Math.round(base * Math.pow(factor, level - 1))
  }

  const currentIterations = levelToIterations(optimizationLevel)

  return (
    <div className="border-b border-gray-200">
      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setMode('2d')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            mode === '2d'
              ? 'border-verdigris text-violet bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            2D Plaatmateriaal
          </span>
        </button>
        <button
          onClick={() => setMode('1d')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            mode === '1d'
              ? 'border-verdigris text-violet bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            1D Lineair
          </span>
        </button>
      </div>

      {/* Settings */}
      <div className="p-4 bg-gray-50 space-y-4">
        {/* Zaagblad & Frees dikte */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zaagblad
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={bladeThickness}
                onChange={(e) => setBladeThickness(Math.max(0, parseFloat(e.target.value) || 0))}
                min="0"
                max="10"
                step="0.5"
                className="w-16 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
              />
              <span className="text-xs text-gray-500">mm</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Buitensnedes</p>
          </div>

          {mode === '2d' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frees
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={routerThickness}
                  onChange={(e) => setRouterThickness(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  max="20"
                  step="0.5"
                  className="w-16 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                />
                <span className="text-xs text-gray-500">mm</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Sparingen/gaten</p>
            </div>
          )}

          {mode === '1d' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Las/koppeling
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={jointAllowance}
                  onChange={(e) => setJointAllowance(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  max="200"
                  step="5"
                  className="w-16 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                />
                <span className="text-xs text-gray-500">mm</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Extra per verbinding</p>
            </div>
          )}
        </div>

        {/* Algoritme keuze (voor beide modes) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Algoritme
          </label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent bg-white"
          >
            {algorithms.map(alg => (
              <option key={alg.id} value={alg.id}>
                {alg.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {algorithms.find(a => a.id === algorithm)?.description}
          </p>
          {algorithms.find(a => a.id === algorithm)?.backend && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Gebruikt Python backend (localhost:8000)
            </p>
          )}
        </div>

        {/* Optimalisatie niveau (voor hybrid algoritme) */}
        {algorithm === 'hybrid' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optimalisatie: <span className="text-verdigris font-semibold">{optimizationLevel}</span>
              <span className="text-gray-400 font-normal ml-1">({levelLabels[optimizationLevel]})</span>
            </label>
            <input
              type="range"
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
              min="1"
              max="10"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-verdigris"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 (snel)</span>
              <span className="text-gray-500">{currentIterations.toLocaleString()} iteraties</span>
              <span>10 (best)</span>
            </div>
          </div>
        )}

        {/* Info voor niet-iteratieve algoritmes */}
        {algorithm !== 'hybrid' && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            💡 Dit algoritme is deterministisch - iteraties hebben geen effect.
          </div>
        )}

        {/* Nerf-richting toggle (alleen voor 2D) */}
        {mode === '2d' && (
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nerf-richting
              </label>
              <p className="text-xs text-gray-500">Voorkom rotatie van stukken met nerf</p>
            </div>
            <button
              onClick={() => setGrainDirection(!grainDirection)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                grainDirection ? 'bg-verdigris' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={grainDirection}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  grainDirection ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Splitsen lange onderdelen (alleen voor 1D) */}
        {mode === '1d' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max delen per onderdeel: <span className="text-verdigris font-semibold">{maxSplitParts}</span>
            </label>
            <input
              type="range"
              value={maxSplitParts}
              onChange={(e) => setMaxSplitParts(parseInt(e.target.value))}
              min="1"
              max="5"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-verdigris"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 (niet splitsen)</span>
              <span>5 (max)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {maxSplitParts === 1 
                ? 'Onderdelen moeten op één stuk passen' 
                : `Lange onderdelen worden in max ${maxSplitParts} delen gezaagd`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
