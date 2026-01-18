/**
 * AlgorithmSelector Component
 * Dropdown voor selectie van optimalisatie algoritme
 * 
 * Props:
 * - mode: '1d' | '2d'
 * - value: huidige algorithm id
 * - onChange: callback bij wijziging
 */
import { useState, useEffect } from 'react'

const ALGORITHMS = {
  '1d': [
    {
      id: 'smart_split',
      name: 'Slim Splitsen',
      description: 'Splitst te lange onderdelen, vult gaten optimaal. Beste voor bouwkunde.',
      badge: 'Aanbevolen',
      badgeColor: 'bg-green-100 text-green-800',
      requiresBackend: true
    },
    {
      id: 'hybrid',
      name: 'Hybrid',
      description: 'Grote stukken eerst, kleine in reststukken. Goede balans.',
      badge: null,
      badgeColor: ''
    },
    {
      id: 'ortools_optimal',
      name: 'OR-Tools Optimaal',
      description: 'Exacte oplossing via Column Generation. Beste resultaat.',
      badge: 'Traag',
      badgeColor: 'bg-orange-100 text-orange-800',
      requiresBackend: true
    },
    {
      id: 'ffd',
      name: 'First Fit Decreasing',
      description: 'Simpele greedy heuristiek. Zeer snel.',
      badge: 'Snel',
      badgeColor: 'bg-yellow-100 text-yellow-800'
    }
  ],
  '2d': [
    {
      id: 'maxrects',
      name: 'MaxRects Packer',
      description: 'Rechthoek-packing algoritme. Snel en redelijk optimaal.',
      badge: 'Huidig',
      badgeColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'maxrects_multistart',
      name: 'MaxRects Multi-Start',
      description: 'Meerdere pogingen met shuffled input. Beter resultaat.',
      badge: 'Nieuw',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'nfp',
      name: 'NFP Nesting',
      description: 'No-Fit Polygon voor complexe vormen. Backend vereist.',
      badge: 'Planned',
      badgeColor: 'bg-gray-100 text-gray-800',
      disabled: true,
      requiresBackend: true
    }
  ]
}

export default function AlgorithmSelector({ mode = '1d', value, onChange, backendAvailable = false }) {
  const algorithms = ALGORITHMS[mode] || ALGORITHMS['1d']
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedAlgo = algorithms.find(a => a.id === value) || algorithms[0]
  
  const handleSelect = (algo) => {
    if (algo.disabled) return
    if (algo.requiresBackend && !backendAvailable) {
      alert('Dit algoritme vereist de Python backend. Start de backend server eerst.')
      return
    }
    onChange(algo.id)
    setIsOpen(false)
  }
  
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Algoritme
      </label>
      
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="flex items-center">
          <span className="block truncate">{selectedAlgo.name}</span>
          {selectedAlgo.badge && (
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedAlgo.badgeColor}`}>
              {selectedAlgo.badge}
            </span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {algorithms.map((algo) => (
            <div
              key={algo.id}
              onClick={() => handleSelect(algo)}
              className={`
                cursor-pointer select-none relative py-2 pl-3 pr-9 
                ${algo.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}
                ${algo.id === value ? 'bg-blue-100' : ''}
              `}
            >
              <div className="flex items-center">
                <span className="font-medium block truncate">{algo.name}</span>
                {algo.badge && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${algo.badgeColor}`}>
                    {algo.badge}
                  </span>
                )}
              </div>
              <span className="text-gray-500 text-sm block truncate">
                {algo.description}
              </span>
              {algo.requiresBackend && !backendAvailable && (
                <span className="text-orange-600 text-xs">
                  ⚠️ Backend niet beschikbaar
                </span>
              )}
              
              {/* Checkmark for selected */}
              {algo.id === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
