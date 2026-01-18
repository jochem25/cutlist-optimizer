/**
 * ManualEditor Component
 * Drag & drop interface voor handmatige herverdeling van onderdelen
 */
import { useState, useRef } from 'react'

// Parse functies voor complexe vormen
function parseBoundary(boundaryStr) {
  if (!boundaryStr) return null
  return boundaryStr.split(';').map(p => {
    const [x, y] = p.split(',').map(Number)
    return { x, y }
  })
}

function parseHoles(holesStr) {
  if (!holesStr) return []
  return holesStr.split('|').map(hole => {
    if (hole.startsWith('CIRCLE:')) {
      const data = hole.replace('CIRCLE:', '')
      const [centerPart, diameter] = data.split(';')
      const [cx, cy] = centerPart.split(',').map(Number)
      return { type: 'circle', cx, cy, d: Number(diameter) }
    } else if (hole.startsWith('POLY:')) {
      const data = hole.replace('POLY:', '')
      const points = data.split(';').map(p => {
        const [x, y] = p.split(',').map(Number)
        return { x, y }
      })
      return { type: 'poly', points }
    }
    return null
  }).filter(Boolean)
}

// Kleuren voor onderdelen
const partColors = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700' },
  { bg: 'bg-lime-100', border: 'border-lime-400', text: 'text-lime-700' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700' },
]

export default function ManualEditor({ results, onSave, onClose }) {
  // Clone results voor lokale state
  const [sheets, setSheets] = useState(() => 
    JSON.parse(JSON.stringify(results.sheets))
  )
  const [parkedParts, setParkedParts] = useState([])
  const [selectedPart, setSelectedPart] = useState(null)
  const [draggedPart, setDraggedPart] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState(null)
  const [history, setHistory] = useState([])

  // Bereken schaal voor plaat weergave
  const calcScale = (sheet, maxWidth = 280, maxHeight = 180) => {
    const scaleX = (maxWidth - 40) / sheet.length
    const scaleY = (maxHeight - 40) / sheet.width
    return Math.min(scaleX, scaleY)
  }

  // Bereken efficiëntie van een plaat
  const calcEfficiency = (sheet) => {
    const usedArea = sheet.parts.reduce((sum, p) => sum + p.length * p.width, 0)
    return (usedArea / (sheet.length * sheet.width)) * 100
  }

  // Bewaar huidige state in history
  const saveToHistory = () => {
    setHistory(prev => [...prev, {
      sheets: JSON.parse(JSON.stringify(sheets)),
      parkedParts: JSON.parse(JSON.stringify(parkedParts))
    }])
  }

  // Ongedaan maken
  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setSheets(prev.sheets)
    setParkedParts(prev.parkedParts)
    setHistory(h => h.slice(0, -1))
  }

  // Drag handlers
  const handleDragStart = (part, sourceType, sourceIndex) => {
    setDraggedPart({ part, sourceType, sourceIndex })
  }

  const handleDragOver = (e, targetType, targetIndex) => {
    e.preventDefault()
    setDragOverTarget({ type: targetType, index: targetIndex })
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = (e, targetType, targetIndex) => {
    e.preventDefault()
    setDragOverTarget(null)
    
    if (!draggedPart) return
    
    const { part, sourceType, sourceIndex } = draggedPart
    
    // Niet droppen op dezelfde locatie
    if (sourceType === targetType && sourceIndex === targetIndex) {
      setDraggedPart(null)
      return
    }

    saveToHistory()

    // Verwijder van bron
    if (sourceType === 'sheet') {
      setSheets(prev => {
        const newSheets = [...prev]
        newSheets[sourceIndex] = {
          ...newSheets[sourceIndex],
          parts: newSheets[sourceIndex].parts.filter(p => p.number !== part.number)
        }
        return newSheets
      })
    } else if (sourceType === 'parking') {
      setParkedParts(prev => prev.filter(p => p.number !== part.number))
    }

    // Voeg toe aan doel
    if (targetType === 'sheet') {
      setSheets(prev => {
        const newSheets = [...prev]
        // Zoek vrije positie (simpel: rechtsboven)
        const existingParts = newSheets[targetIndex].parts
        let newX = 0
        let newY = 0
        
        // Simpele plaatsing: zoek eerste vrije plek
        existingParts.forEach(p => {
          if (p.x + p.length > newX) newX = p.x + p.length + 3
        })
        
        if (newX + part.length > newSheets[targetIndex].length) {
          newX = 0
          newY = Math.max(...existingParts.map(p => p.y + p.width), 0) + 3
        }

        newSheets[targetIndex] = {
          ...newSheets[targetIndex],
          parts: [...newSheets[targetIndex].parts, { ...part, x: newX, y: newY }]
        }
        return newSheets
      })
    } else if (targetType === 'parking') {
      setParkedParts(prev => [...prev, part])
    }

    setDraggedPart(null)
    setSelectedPart(null)
  }

  // Parkeer geselecteerd onderdeel
  const handleParkSelected = () => {
    if (!selectedPart) return
    
    saveToHistory()
    
    // Zoek en verwijder van sheet
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      parts: sheet.parts.filter(p => p.number !== selectedPart.number)
    })))
    
    // Voeg toe aan parking
    setParkedParts(prev => [...prev, selectedPart])
    setSelectedPart(null)
  }

  // Roteer geselecteerd onderdeel
  const handleRotateSelected = () => {
    if (!selectedPart) return
    
    saveToHistory()
    
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      parts: sheet.parts.map(p => {
        if (p.number === selectedPart.number) {
          return {
            ...p,
            length: p.width,
            width: p.length,
            rotated: !p.rotated
          }
        }
        return p
      })
    })))

    setSelectedPart(prev => prev ? {
      ...prev,
      length: prev.width,
      width: prev.length,
      rotated: !prev.rotated
    } : null)
  }

  // Opslaan
  const handleSave = () => {
    const updatedResults = {
      ...results,
      sheets: sheets.map(s => ({
        ...s,
        efficiency: calcEfficiency(s)
      })),
      parkedParts
    }
    onSave(updatedResults)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-violet text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">Handmatige herverdeling</h2>
            <span className="text-violet-200 text-sm">Sleep onderdelen tussen platen</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                history.length === 0
                  ? 'bg-violet-700/50 text-violet-300 cursor-not-allowed'
                  : 'bg-violet-700 hover:bg-violet-600'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l6 6M3 10l6-6"/>
              </svg>
              Ongedaan maken
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-verdigris hover:bg-verdigris-light rounded-lg text-sm font-medium transition-colors"
            >
              Opslaan
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Main area */}
          <div className="flex-1 overflow-auto p-4">
            
            {/* Parkeerplaats */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-friendly-yellow" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Parkeerplaats</span>
                <span className="text-xs text-gray-400">({parkedParts.length} onderdelen)</span>
              </div>
              <div
                onDragOver={(e) => handleDragOver(e, 'parking', 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'parking', 0)}
                className={`min-h-16 border-2 border-dashed rounded-lg p-3 flex flex-wrap gap-2 transition-colors ${
                  dragOverTarget?.type === 'parking'
                    ? 'bg-verdigris/10 border-verdigris'
                    : 'bg-friendly-yellow/10 border-friendly-yellow/50'
                }`}
              >
                {parkedParts.length === 0 ? (
                  <span className="text-sm text-gray-400 italic">Sleep onderdelen hierheen om ze tijdelijk te parkeren...</span>
                ) : (
                  parkedParts.map((part) => {
                    const colorIdx = (part.number - 1) % partColors.length
                    const colors = partColors[colorIdx]
                    return (
                      <div
                        key={part.number}
                        draggable
                        onDragStart={() => handleDragStart(part, 'parking', 0)}
                        onClick={() => setSelectedPart(part)}
                        className={`${colors.bg} ${colors.border} border rounded-lg p-2 cursor-grab active:cursor-grabbing select-none ${
                          selectedPart?.number === part.number ? 'ring-2 ring-violet' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-violet text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {part.number}
                          </span>
                          <div className="text-xs">
                            <div className="font-medium">{part.name}</div>
                            <div className="text-gray-500">{part.length}×{part.width}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Platen grid */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {sheets.map((sheet, sheetIndex) => {
                const scale = calcScale(sheet)
                const efficiency = calcEfficiency(sheet)
                const isDropTarget = dragOverTarget?.type === 'sheet' && dragOverTarget?.index === sheetIndex
                
                return (
                  <div key={sheetIndex} className="flex-shrink-0">
                    {/* Sheet header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-violet">
                          {sheet.isVirtual ? '♻️' : ''} Plaat {sheetIndex + 1}
                        </span>
                        <span className="text-xs text-gray-400">{sheet.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        efficiency >= 70 ? 'bg-verdigris/10 text-verdigris' : 'bg-friendly-yellow/20 text-yellow-700'
                      }`}>
                        {efficiency.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Sheet diagram */}
                    <div
                      onDragOver={(e) => handleDragOver(e, 'sheet', sheetIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'sheet', sheetIndex)}
                      className={`bg-white border-2 rounded-lg relative transition-colors ${
                        isDropTarget ? 'border-verdigris bg-verdigris/5' : 'border-gray-200'
                      }`}
                      style={{
                        width: sheet.length * scale + 40,
                        height: sheet.width * scale + 40
                      }}
                    >
                      {/* Plaat achtergrond */}
                      <div
                        className="absolute bg-gray-50 border border-gray-200"
                        style={{
                          left: 20,
                          top: 20,
                          width: sheet.length * scale,
                          height: sheet.width * scale
                        }}
                      />
                      
                      {/* Parts */}
                      {sheet.parts.map((part) => {
                        const colorIdx = (part.number - 1) % partColors.length
                        const colors = partColors[colorIdx]
                        const isSelected = selectedPart?.number === part.number
                        const isDragging = draggedPart?.part.number === part.number
                        
                        return (
                          <div
                            key={part.number}
                            draggable
                            onDragStart={() => handleDragStart(part, 'sheet', sheetIndex)}
                            onClick={() => setSelectedPart(part)}
                            className={`absolute ${colors.bg} ${colors.border} border rounded cursor-grab active:cursor-grabbing select-none flex items-center justify-center transition-all ${
                              isSelected ? 'ring-2 ring-violet ring-offset-1 z-10' : ''
                            } ${isDragging ? 'opacity-50' : ''}`}
                            style={{
                              left: 20 + part.x * scale,
                              top: 20 + part.y * scale,
                              width: part.length * scale,
                              height: part.width * scale
                            }}
                          >
                            <div className="text-center p-1 overflow-hidden">
                              <div className={`text-xs font-bold ${colors.text}`}>#{part.number}</div>
                              {part.length * scale > 50 && part.width * scale > 30 && (
                                <>
                                  <div className="text-xs truncate">{part.name}</div>
                                  <div className="text-xs text-gray-500">{part.length}×{part.width}</div>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Drop indicator */}
                      {isDropTarget && sheet.parts.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-verdigris text-sm font-medium">Laat hier los</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Sheet dimensions */}
                    <div className="mt-1 text-xs text-gray-400 text-center">
                      {sheet.length} × {sheet.width} mm
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-64 border-l border-gray-200 bg-white p-4 flex flex-col">
            {/* Selected part info */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-violet mb-3">
                {selectedPart ? 'Geselecteerd onderdeel' : 'Selecteer een onderdeel'}
              </h3>
              
              {selectedPart ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nummer:</span>
                    <span className="font-medium">#{selectedPart.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Naam:</span>
                    <span className="font-medium truncate ml-2">{selectedPart.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Afmeting:</span>
                    <span className="font-medium">{selectedPart.length} × {selectedPart.width}</span>
                  </div>
                  {selectedPart.rotated && (
                    <div className="text-xs text-verdigris">↻ Geroteerd</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Klik op een onderdeel om acties te zien</p>
              )}
            </div>

            {/* Actions */}
            {selectedPart && (
              <div className="space-y-2">
                <button
                  onClick={handleRotateSelected}
                  className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                  90° roteren
                </button>
                <button
                  onClick={handleParkSelected}
                  className="w-full px-3 py-2 text-sm bg-friendly-yellow/20 hover:bg-friendly-yellow/30 text-yellow-700 rounded-lg transition-colors text-left flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 9h6v6H9z"/>
                  </svg>
                  Naar parkeerplaats
                </button>
              </div>
            )}

            {/* Parts overview */}
            <div className="mt-6 flex-1 overflow-auto">
              <h3 className="text-sm font-semibold text-violet mb-2">Alle onderdelen</h3>
              <div className="space-y-1">
                {sheets.flatMap(s => s.parts).concat(parkedParts).sort((a, b) => a.number - b.number).map(part => {
                  const isParked = parkedParts.some(p => p.number === part.number)
                  const sheetIdx = sheets.findIndex(s => s.parts.some(p => p.number === part.number))
                  
                  return (
                    <div
                      key={part.number}
                      onClick={() => setSelectedPart(part)}
                      className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                        selectedPart?.number === part.number
                          ? 'bg-violet/10 border border-violet'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">#{part.number} {part.name}</span>
                        <span className={isParked ? 'text-yellow-600' : 'text-gray-400'}>
                          {isParked ? 'Geparkeerd' : `Plaat ${sheetIdx + 1}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
