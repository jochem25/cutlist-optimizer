/**
 * CuttingDiagram Component
 * Visualiseert zaagplannen met 3 view modes:
 * - tabs: één plaat tegelijk met tabs
 * - multi: alle platen naast elkaar (read-only)
 * - edit: drag & drop herverdeling (mouse-based)
 */
import { useState, useRef, useEffect, forwardRef, useMemo } from 'react'

// Parse boundary string naar punten array
function parseBoundary(boundaryStr) {
  if (!boundaryStr) return null
  return boundaryStr.split(';').map(p => {
    const [x, y] = p.split(',').map(Number)
    return { x, y }
  })
}

// Parse holes string naar array van hole objects
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

// Converteer punten naar SVG path
function pointsToPath(points, scale, offsetX, offsetY) {
  if (!points || points.length === 0) return ''
  const scaled = points.map(p => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale
  }))
  return `M ${scaled.map(p => `${p.x},${p.y}`).join(' L ')} Z`
}

// Kleuren voor onderdelen - gegroepeerd op base ID (voor split parts)
const partColors = [
  { bg: '#DBEAFE', border: '#60A5FA', text: '#1D4ED8' },  // Blauw
  { bg: '#D1FAE5', border: '#34D399', text: '#047857' },  // Groen
  { bg: '#F3E8FF', border: '#C084FC', text: '#7C3AED' },  // Paars
  { bg: '#FFEDD5', border: '#FB923C', text: '#C2410C' },  // Oranje
  { bg: '#FCE7F3', border: '#F472B6', text: '#BE185D' },  // Roze
  { bg: '#CFFAFE', border: '#22D3EE', text: '#0E7490' },  // Cyaan
  { bg: '#FEF3C7', border: '#FBBF24', text: '#B45309' },  // Geel
  { bg: '#FFE4E6', border: '#FB7185', text: '#BE123C' },  // Rood
  { bg: '#E0E7FF', border: '#818CF8', text: '#4338CA' },  // Indigo
  { bg: '#ECFDF5', border: '#6EE7B7', text: '#059669' },  // Emerald
]

// Extract base ID from part name/id (e.g., "Plint_d1" -> "Plint", "3381_d2" -> "3381")
function getBasePartId(partId) {
  if (!partId) return partId
  // Match patterns like "_d1", "_d2", "_1", "_2" at the end
  const match = partId.match(/^(.+?)(?:_d?\d+)?$/)
  return match ? match[1] : partId
}

// Build color map for all unique base IDs
function buildColorMap(sheets) {
  const baseIds = new Set()
  sheets?.forEach(sheet => {
    sheet.parts?.forEach(part => {
      const baseId = getBasePartId(part.name || part.id)
      baseIds.add(baseId)
    })
  })
  
  const colorMap = {}
  let colorIndex = 0
  baseIds.forEach(baseId => {
    colorMap[baseId] = partColors[colorIndex % partColors.length]
    colorIndex++
  })
  return colorMap
}

// Get color for a part based on its base ID
function getPartColor(part, colorMap, isEdit = false) {
  if (!colorMap) return { bg: '#E5E7EB', border: '#6B7280', text: '#374151' }
  const baseId = getBasePartId(part.name || part.id)
  return colorMap[baseId] || partColors[0]
}

// Grid & Snap settings
const GRID_SIZE = 50 // mm
const SNAP_THRESHOLD = 15 // mm - magnetische afstand

// Snap positie naar grid/randen
function snapPosition(x, y, partLength, partWidth, sheetLength, sheetWidth, existingParts, kerf = 3) {
  let snappedX = x
  let snappedY = y
  
  // Snap naar grid
  const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE
  const gridY = Math.round(y / GRID_SIZE) * GRID_SIZE
  if (Math.abs(x - gridX) < SNAP_THRESHOLD) snappedX = gridX
  if (Math.abs(y - gridY) < SNAP_THRESHOLD) snappedY = gridY
  
  // Snap naar plaatranden (links/boven)
  if (x < SNAP_THRESHOLD) snappedX = 0
  if (y < SNAP_THRESHOLD) snappedY = 0
  
  // Snap naar plaatranden (rechts/onder) - rekening houdend met part size
  const rightEdge = sheetLength - partLength
  const bottomEdge = sheetWidth - partWidth
  if (Math.abs(x - rightEdge) < SNAP_THRESHOLD) snappedX = rightEdge
  if (Math.abs(y - bottomEdge) < SNAP_THRESHOLD) snappedY = bottomEdge
  
  // Snap naar randen van andere onderdelen
  for (const part of existingParts) {
    // Rechterrand van bestaand onderdeel + kerf
    const partRight = part.x + part.length + kerf
    if (Math.abs(x - partRight) < SNAP_THRESHOLD) snappedX = partRight
    
    // Onderrand van bestaand onderdeel + kerf
    const partBottom = part.y + part.width + kerf
    if (Math.abs(y - partBottom) < SNAP_THRESHOLD) snappedY = partBottom
    
    // Linkerrand uitlijnen
    if (Math.abs(x - part.x) < SNAP_THRESHOLD) snappedX = part.x
    
    // Bovenrand uitlijnen
    if (Math.abs(y - part.y) < SNAP_THRESHOLD) snappedY = part.y
  }
  
  // Clamp binnen plaat
  snappedX = Math.max(0, Math.min(snappedX, sheetLength - partLength))
  snappedY = Math.max(0, Math.min(snappedY, sheetWidth - partWidth))
  
  return { x: snappedX, y: snappedY }
}

// Check of twee rechthoeken overlappen (AABB collision met kerf)
// Voor 1D mode: width wordt als 1 behandeld (alleen length telt)
function checkCollision(part1, part2, kerf = 3) {
  const w1 = part1.width || 1
  const w2 = part2.width || 1
  return !(
    part1.x + part1.length + kerf <= part2.x ||  // part1 is links van part2
    part2.x + part2.length + kerf <= part1.x ||  // part2 is links van part1
    part1.y + w1 + kerf <= part2.y ||            // part1 is boven part2
    part2.y + w2 + kerf <= part1.y               // part2 is boven part1
  )
}

// Check of een part ergens op de sheet past zonder collision
function hasAnyCollision(newPart, existingParts, kerf = 3) {
  for (const existing of existingParts) {
    if (checkCollision(newPart, existing, kerf)) {
      return true
    }
  }
  return false
}

// Check of part binnen de sheet grenzen valt
function isWithinBounds(part, sheetLength, sheetWidth) {
  const partWidth = part.width || 1
  const sWidth = sheetWidth || 1
  return part.x >= 0 && 
         part.y >= 0 && 
         part.x + part.length <= sheetLength && 
         part.y + partWidth <= sWidth
}

// Vind een vrije positie voor een part (fallback als drop positie collision heeft)
function findFreePosition(part, sheet, kerf = 3, is1D = false) {
  const step = 10 // mm stappen
  const partWidth = part.width || 1
  const sheetWidth = sheet.width || 1
  
  if (is1D) {
    // 1D mode: alleen X-as, Y is altijd 0
    for (let x = 0; x <= sheet.length - part.length; x += step) {
      const testPart = { ...part, x, y: 0 }
      if (!hasAnyCollision(testPart, sheet.parts, kerf)) {
        return { x, y: 0 }
      }
    }
  } else {
    // 2D mode: zoek in grid
    for (let x = 0; x <= sheet.length - part.length; x += step) {
      for (let y = 0; y <= sheetWidth - partWidth; y += step) {
        const testPart = { ...part, x, y }
        if (!hasAnyCollision(testPart, sheet.parts, kerf)) {
          return { x, y }
        }
      }
    }
  }
  
  // Geen vrije plek gevonden
  return null
}

export default function CuttingDiagram({ mode, results, setResults, selectedSheet, setSelectedSheet, kerf = 3, stock = [] }) {
  const [viewMode, setViewMode] = useState('tabs')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  
  // Edit mode state
  const [editSheets, setEditSheets] = useState(null)
  const [parkedParts, setParkedParts] = useState([])
  const [selectedPart, setSelectedPart] = useState(null)
  const [history, setHistory] = useState([])
  
  // Drag state (mouse-based)
  const [dragging, setDragging] = useState(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [dropTarget, setDropTarget] = useState(null)
  const [dropCoords, setDropCoords] = useState(null) // { sheetIndex, x, y } in mm
  const sheetRefs = useRef({})

  // Build color map for part groups (split parts get same color)
  const currentSheets = viewMode === 'edit' ? editSheets : results?.sheets
  const colorMap = useMemo(() => buildColorMap(currentSheets), [currentSheets])

  // Helper: Bereken totale rest (waste)
  const calculateTotalWaste = (sheets, is2D) => {
    if (!sheets || sheets.length === 0) return 0
    
    return sheets.reduce((total, sheet) => {
      if (sheet.waste !== undefined) {
        return total + sheet.waste
      }
      // Bereken waste als niet beschikbaar
      if (is2D) {
        const sheetArea = (sheet.length || 0) * (sheet.width || 0)
        const partsArea = (sheet.parts || []).reduce((sum, p) => 
          sum + (p.length || 0) * (p.width || 0), 0)
        return total + (sheetArea - partsArea)
      } else {
        const partsLength = (sheet.parts || []).reduce((sum, p) => 
          sum + (p.length || 0) + kerf, 0) - kerf
        return total + ((sheet.length || 0) - Math.max(0, partsLength))
      }
    }, 0)
  }

  // Helper: Format waste voor display
  const formatWaste = (waste, is2D) => {
    if (is2D) {
      return `${(waste / 1000000).toFixed(2)} m²`
    } else {
      return `${(waste / 1000).toFixed(2)} m`
    }
  }

  // Helper: Bereken overgebleven voorraad
  const calculateRemainingStock = (sheets, stockList, is2D) => {
    if (!sheets || !stockList || stockList.length === 0) return []
    
    // Tel gebruikte stock per type
    const usedCount = {}
    sheets.forEach(sheet => {
      const stockName = sheet.name || sheet.stockId || 'Unknown'
      usedCount[stockName] = (usedCount[stockName] || 0) + 1
    })
    
    // Bereken wat over is
    const remaining = []
    stockList.forEach(s => {
      const available = s.quantity === -1 ? 999 : s.quantity
      const used = usedCount[s.name] || 0
      const left = available === 999 ? '∞' : Math.max(0, available - used)
      
      if (left !== 0 && left !== '∞') {
        remaining.push({
          name: s.name,
          length: s.length,
          width: s.width,
          available: available === 999 ? '∞' : available,
          used: used,
          remaining: left
        })
      }
    })
    
    return remaining
  }

  // Init edit mode
  const initEditMode = () => {
    setEditSheets(JSON.parse(JSON.stringify(results.sheets)))
    setParkedParts([])
    setSelectedPart(null)
    setHistory([])
    setViewMode('edit')
  }

  // Exit edit mode
  const cancelEdit = () => {
    setEditSheets(null)
    setParkedParts([])
    setSelectedPart(null)
    setDragging(null)
    setDropCoords(null)
    setHistory([])
    setViewMode('tabs')
  }

  // Save edit
  const saveEdit = () => {
    if (!setResults) return
    const updatedResults = {
      ...results,
      sheets: editSheets.map(s => ({
        ...s,
        efficiency: calcEfficiency(s)
      })),
      summary: {
        ...results.summary,
        avgEfficiency: editSheets.reduce((sum, s) => sum + calcEfficiency(s), 0) / editSheets.length
      }
    }
    setResults(updatedResults)
    cancelEdit()
  }

  const calcEfficiency = (sheet) => {
    const usedArea = sheet.parts.reduce((sum, p) => sum + p.length * p.width, 0)
    return (usedArea / (sheet.length * sheet.width)) * 100
  }

  const saveToHistory = () => {
    setHistory(prev => [...prev.slice(-19), {
      sheets: JSON.parse(JSON.stringify(editSheets)),
      parkedParts: JSON.parse(JSON.stringify(parkedParts))
    }])
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setEditSheets(prev.sheets)
    setParkedParts(prev.parkedParts)
    setHistory(h => h.slice(0, -1))
  }

  // Mouse drag handlers
  const handleMouseDown = (e, part, sourceType, sourceIndex) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging({ part, sourceType, sourceIndex })
    setDragPos({ x: e.clientX, y: e.clientY })
    setSelectedPart(part)
  }

  // Bereken positie op sheet vanuit muis event
  const calcSheetPosition = (e, sheetIndex, sheet, scale, padding) => {
    const svgEl = sheetRefs.current[sheetIndex]
    if (!svgEl) return null
    
    const rect = svgEl.getBoundingClientRect()
    
    // Muis positie relatief aan SVG
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top
    
    // Converteer naar mm (aftrekken padding, delen door scale - scale bevat al zoomLevel)
    const mmX = (svgX - padding) / scale
    const mmY = (svgY - padding) / scale
    
    return { x: mmX, y: mmY }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e) => {
      setDragPos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = (e) => {
      if (dropTarget && dragging) {
        const { part, sourceType, sourceIndex } = dragging
        const { type: targetType, index: targetIndex } = dropTarget

        // Allow same sheet repositioning, block only exact same source
        const isSameLocation = sourceType === targetType && sourceIndex === targetIndex && sourceType === 'parking'
        if (!isSameLocation) {
          
          // Bij sheet drop: eerst checken of er ruimte is VOORDAT we iets verwijderen
          if (targetType === 'sheet') {
            const sheet = editSheets[targetIndex]
            const otherParts = sheet.parts.filter(p => p.number !== part.number)
            
            let finalPosition = null
            
            // Gebruik drop coördinaten als beschikbaar
            if (dropCoords && dropCoords.sheetIndex === targetIndex) {
              const rawX = dropCoords.x - part.length / 2
              const rawY = dropCoords.y - part.width / 2
              const snapped = snapPosition(rawX, rawY, part.length, part.width, sheet.length, sheet.width, otherParts, kerf)
              const testPart = { ...part, x: snapped.x, y: snapped.y }
              
              if (!hasAnyCollision(testPart, otherParts, kerf) && isWithinBounds(testPart, sheet.length, sheet.width)) {
                finalPosition = { x: snapped.x, y: snapped.y }
              }
            }
            
            // Als geen geldige drop positie, zoek een vrije plek
            if (!finalPosition) {
              finalPosition = findFreePosition(part, { ...sheet, parts: otherParts }, kerf, mode === '1d')
            }
            
            // Als er geen vrije plek is, annuleer de drop (onderdeel blijft waar het was)
            if (!finalPosition) {
              console.warn(`Geen ruimte voor part ${part.number} op plaat ${targetIndex + 1}`)
              setDragging(null)
              setDropTarget(null)
              setDropCoords(null)
              return
            }
            
            // Nu pas history opslaan en uitvoeren
            saveToHistory()
            
            // Remove from source
            if (sourceType === 'sheet') {
              setEditSheets(prev => {
                const newSheets = [...prev]
                newSheets[sourceIndex] = {
                  ...newSheets[sourceIndex],
                  parts: newSheets[sourceIndex].parts.filter(p => p.number !== part.number)
                }
                // Add to target sheet in dezelfde update
                newSheets[targetIndex] = {
                  ...newSheets[targetIndex],
                  parts: [...newSheets[targetIndex].parts.filter(p => p.number !== part.number), { ...part, x: finalPosition.x, y: finalPosition.y }]
                }
                return newSheets
              })
            } else if (sourceType === 'parking') {
              setParkedParts(prev => prev.filter(p => p.number !== part.number))
              setEditSheets(prev => {
                const newSheets = [...prev]
                newSheets[targetIndex] = {
                  ...newSheets[targetIndex],
                  parts: [...newSheets[targetIndex].parts, { ...part, x: finalPosition.x, y: finalPosition.y }]
                }
                return newSheets
              })
            }
            
          } else if (targetType === 'parking') {
            // Parking heeft geen collision check
            saveToHistory()
            
            // Remove from source
            if (sourceType === 'sheet') {
              setEditSheets(prev => {
                const newSheets = [...prev]
                newSheets[sourceIndex] = {
                  ...newSheets[sourceIndex],
                  parts: newSheets[sourceIndex].parts.filter(p => p.number !== part.number)
                }
                return newSheets
              })
            }
            
            // Add to parking (ook als sourceType parking was - geen effect)
            if (sourceType !== 'parking') {
              setParkedParts(prev => [...prev, part])
            }
          }
        }
      }
      setDragging(null)
      setDropTarget(null)
      setDropCoords(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, dropTarget, dropCoords])

  const handleParkSelected = () => {
    if (!selectedPart) return
    saveToHistory()
    setEditSheets(prev => prev.map(sheet => ({
      ...sheet,
      parts: sheet.parts.filter(p => p.number !== selectedPart.number)
    })))
    setParkedParts(prev => [...prev, selectedPart])
    setSelectedPart(null)
  }

  const handleRotateSelected = () => {
    if (!selectedPart) return
    saveToHistory()
    
    setEditSheets(prev => prev.map(sheet => ({
      ...sheet,
      parts: sheet.parts.map(p => {
        if (p.number === selectedPart.number) {
          return { ...p, length: p.width, width: p.length, rotated: !p.rotated }
        }
        return p
      })
    })))
    
    setParkedParts(prev => prev.map(p => {
      if (p.number === selectedPart.number) {
        return { ...p, length: p.width, width: p.length, rotated: !p.rotated }
      }
      return p
    }))

    setSelectedPart(prev => prev ? { ...prev, length: prev.width, width: prev.length, rotated: !prev.rotated } : null)
  }

  // Empty state
  if (!results || results.sheets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <svg className="w-20 h-20 mx-auto mb-4 stroke-gray-300" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <p className="text-lg mb-1">Geen resultaten</p>
          <p className="text-sm">Voeg voorraad en onderdelen toe, en klik op "Bereken zaagplan"</p>
        </div>
      </div>
    )
  }

  const sheets = viewMode === 'edit' ? editSheets : results.sheets
  const sheet = sheets?.[selectedSheet] || sheets?.[0]

  const baseMaxWidth = viewMode === 'tabs' ? 700 : 280
  const baseMaxHeight = mode === '2d' ? (viewMode === 'tabs' ? 500 : 180) : 100
  const padding = viewMode === 'tabs' ? 60 : 35

  const calcScale = (s, maxW = baseMaxWidth, maxH = baseMaxHeight) => {
    const scaleX = (maxW - padding * 2) / s.length
    const scaleY = mode === '2d' ? (maxH - padding * 2) / s.width : 1
    return mode === '2d' ? Math.min(scaleX, scaleY) : scaleX
  }

  const scale = sheet ? calcScale(sheet) * zoomLevel : 1

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => { if (viewMode === 'edit') cancelEdit(); else setViewMode('tabs'); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'tabs' ? 'bg-violet text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Tabs weergave"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            </button>
            <button
              onClick={() => { if (viewMode === 'edit') cancelEdit(); else setViewMode('multi'); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'multi' ? 'bg-violet text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Alle platen naast elkaar"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="6" height="18" rx="1"/>
                <rect x="9" y="3" width="6" height="18" rx="1"/>
                <rect x="16" y="3" width="6" height="18" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => { if (viewMode !== 'edit') initEditMode(); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'edit' ? 'bg-violet text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Handmatig aanpassen"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-4">
            <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
              </svg>
            </button>
            <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
              </svg>
            </button>
            <button onClick={() => setZoomLevel(1)} className="p-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded ml-1">Reset</button>
          </div>

          {/* Grid toggle (edit mode) */}
          {viewMode === 'edit' && (
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`ml-2 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                showGrid ? 'bg-verdigris/20 text-verdigris' : 'bg-gray-100 text-gray-500'
              }`}
              title="Toon grid (50mm)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/>
                <path d="M8 3v18M13 3v18M18 3v18"/>
                <path d="M3 8h18M3 13h18M3 18h18"/>
              </svg>
              Grid
            </button>
          )}

          {/* Edit mode actions */}
          {viewMode === 'edit' && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  history.length === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l6 6M3 10l6-6"/>
                </svg>
                Undo
              </button>
              <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
                Annuleren
              </button>
              <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-medium bg-verdigris text-white rounded hover:bg-verdigris-light transition-colors">
                Opslaan
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          {sheets?.length || 0} {mode === '2d' ? 'platen' : 'balken'} • {results.summary.totalParts} stukken • {results.summary.avgEfficiency.toFixed(1)}%
          {' • '}
          <span className="text-warm-magenta font-medium">
            {formatWaste(calculateTotalWaste(sheets, mode === '2d'), mode === '2d')} rest
          </span>
          {/* Niet-geplaatste onderdelen indicator */}
          {results.unplacedDetails && results.unplacedDetails.length > 0 && (
            <span className="ml-2 text-warm-magenta font-bold">
              • ⚠️ {results.unplacedDetails.length} niet geplaatst
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        
        {/* Parking zone (edit mode only) */}
        {viewMode === 'edit' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-friendly-yellow" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Parkeerplaats</span>
              <span className="text-xs text-gray-400">({parkedParts.length})</span>
            </div>
            <div
              onMouseEnter={() => dragging && setDropTarget({ type: 'parking', index: 0 })}
              onMouseLeave={() => setDropTarget(null)}
              className={`min-h-16 border-2 border-dashed rounded-lg p-3 flex flex-wrap gap-2 transition-colors ${
                dropTarget?.type === 'parking' ? 'bg-verdigris/20 border-verdigris' : 'bg-friendly-yellow/10 border-friendly-yellow/50'
              }`}
            >
              {parkedParts.length === 0 && !dragging ? (
                <span className="text-sm text-gray-400 italic">Sleep onderdelen hierheen om ze tijdelijk te parkeren...</span>
              ) : parkedParts.map(part => {
                const colors = colorMap ? getPartColor(part, colorMap) : partColors[(part.number - 1) % partColors.length]
                const isDragging = dragging?.part.number === part.number
                return (
                  <div
                    key={part.number}
                    onMouseDown={(e) => handleMouseDown(e, part, 'parking', 0)}
                    onClick={() => !dragging && setSelectedPart(part)}
                    className={`rounded-lg p-2 cursor-grab active:cursor-grabbing select-none border transition-all ${
                      selectedPart?.number === part.number ? 'ring-2 ring-violet' : ''
                    } ${isDragging ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-violet text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {part.number}
                      </span>
                      <div className="text-xs">
                        <div className="font-medium">{part.name}</div>
                        <div style={{ color: colors.text }}>{part.length}×{part.width}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Niet-geplaatste onderdelen (edit mode) */}
        {viewMode === 'edit' && results.unplacedDetails && results.unplacedDetails.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-warm-magenta" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Niet-geplaatste onderdelen</span>
              <span className="text-xs text-warm-magenta font-medium">({results.unplacedDetails.length})</span>
            </div>
            <div className="border-2 border-dashed border-warm-magenta/50 bg-warm-magenta/5 rounded-lg p-3 flex flex-wrap gap-2">
              {results.unplacedDetails.map((part, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-warm-magenta/30 rounded-lg p-2 text-xs"
                >
                  <div className="font-medium text-gray-700">{part.name || part.id || part.label}</div>
                  <div className="text-warm-magenta font-bold">
                    {mode === '2d' 
                      ? `${part.length}×${part.width}mm` 
                      : `${part.length}mm`
                    }
                  </div>
                  {part.reason && (
                    <div className="text-gray-400 text-[10px] mt-1">{part.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'tabs' ? (
          // TABS VIEW
          <>
            {results.sheets.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {results.sheets.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSheet(index)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      selectedSheet === index
                        ? s.isVirtual ? 'bg-emerald-600 text-white' : 'bg-violet text-white'
                        : s.isVirtual ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-verdigris'
                    }`}
                  >
                    {s.isVirtual ? '♻️' : ''} Plaat {index + 1}
                    <span className="ml-2 text-xs opacity-75">({s.parts.length})</span>
                  </button>
                ))}
              </div>
            )}
            
            <div className="mb-4 flex items-center gap-4">
              <h3 className="text-sm font-semibold text-violet">{sheet?.name}</h3>
              <span className="text-xs text-gray-500">{sheet?.length} × {sheet?.width} mm</span>
              <span className={`text-xs px-2 py-1 rounded ${sheet?.efficiency >= 80 ? 'bg-verdigris/10 text-verdigris' : 'bg-friendly-yellow/20 text-yellow-700'}`}>
                {sheet?.efficiency?.toFixed(1)}%
              </span>
            </div>

            {sheet && <SheetSVG sheet={sheet} scale={scale} padding={padding} mode={mode} colorMap={colorMap} />}
          </>
        ) : (
          // MULTI / EDIT VIEW - Grid layout (2-3 per rij)
          <div className="flex flex-wrap gap-4 pb-4">
            {sheets?.map((s, index) => {
              const sheetScale = calcScale(s, 280, 180) * zoomLevel
              const isDropTarget = viewMode === 'edit' && dropTarget?.type === 'sheet' && dropTarget?.index === index
              const eff = viewMode === 'edit' ? calcEfficiency(s) : s.efficiency

              return (
                <div key={index} className="w-[320px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-violet">
                      {s.isVirtual ? '♻️' : ''} Plaat {index + 1}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${eff >= 70 ? 'bg-verdigris/10 text-verdigris' : 'bg-friendly-yellow/20 text-yellow-700'}`}>
                      {eff.toFixed(0)}%
                    </span>
                  </div>

                  <div
                    onClick={() => { if (viewMode === 'multi') { setSelectedSheet(index); setViewMode('tabs'); }}}
                    onMouseMove={(e) => {
                      if (viewMode === 'edit' && dragging) {
                        setDropTarget({ type: 'sheet', index })
                        const pos = calcSheetPosition(e, index, s, sheetScale, 25)
                        if (pos) setDropCoords({ sheetIndex: index, x: pos.x, y: pos.y })
                      }
                    }}
                    onMouseLeave={() => {
                      if (viewMode === 'edit') {
                        setDropTarget(null)
                        setDropCoords(null)
                      }
                    }}
                    className={`bg-white border-2 rounded-lg transition-all ${
                      viewMode === 'multi' ? 'cursor-pointer hover:shadow-lg' : ''
                    } ${isDropTarget ? 'border-verdigris bg-verdigris/5' : 'border-gray-200'} ${
                      viewMode === 'multi' && selectedSheet === index ? 'ring-2 ring-violet ring-offset-2' : ''
                    }`}
                  >
                    <SheetSVG 
                      ref={el => sheetRefs.current[index] = el}
                      sheet={s} 
                      scale={sheetScale} 
                      padding={25} 
                      mode={mode} 
                      compact={true}
                      colorMap={colorMap}
                      isEdit={viewMode === 'edit'}
                      showGrid={viewMode === 'edit' && showGrid}
                      selectedPart={selectedPart}
                      onPartMouseDown={viewMode === 'edit' ? (e, part) => handleMouseDown(e, part, 'sheet', index) : undefined}
                      onPartClick={viewMode === 'edit' ? (part) => !dragging && setSelectedPart(part) : undefined}
                      draggingPart={dragging?.part}
                      dropPreview={isDropTarget && dropCoords && dragging ? (() => {
                        const rawX = dropCoords.x - dragging.part.length / 2
                        const rawY = dropCoords.y - dragging.part.width / 2
                        const otherParts = s.parts.filter(p => p.number !== dragging.part.number)
                        const snapped = snapPosition(rawX, rawY, dragging.part.length, dragging.part.width, s.length, s.width, otherParts, kerf)
                        const testPart = { ...dragging.part, x: snapped.x, y: snapped.y }
                        const hasCollision = hasAnyCollision(testPart, otherParts, kerf) || !isWithinBounds(testPart, s.length, s.width)
                        return {
                          x: snapped.x,
                          y: snapped.y,
                          length: dragging.part.length,
                          width: dragging.part.width,
                          collision: hasCollision
                        }
                      })() : null}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-400 text-center">{s.length}×{s.width}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Selected part actions */}
        {viewMode === 'edit' && selectedPart && !dragging && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 inline-flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-500">Geselecteerd:</span>
              <span className="ml-2 font-medium">#{selectedPart.number} {selectedPart.name}</span>
              <span className="ml-2 text-gray-400">{selectedPart.length}×{selectedPart.width}</span>
              {selectedPart.rotated && <span className="ml-2 text-verdigris text-xs">↻</span>}
            </div>
            <button onClick={handleRotateSelected} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors">
              90° roteren
            </button>
            <button onClick={handleParkSelected} className="px-3 py-1.5 text-xs bg-friendly-yellow/20 hover:bg-friendly-yellow/30 text-yellow-700 rounded transition-colors">
              Parkeren
            </button>
          </div>
        )}

        {/* Legend */}
        <div className={`mt-4 text-xs text-gray-500 ${viewMode === 'edit' ? 'flex justify-end' : 'flex flex-wrap gap-6'}`}>
          {viewMode === 'edit' ? (
            <div className="flex flex-col gap-1 items-end">
              <div className="flex items-center gap-2">
                <span>Gezaagd stuk</span>
                <div className="w-4 h-4 bg-gray-200 border border-gray-500 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>Geparkeerd</span>
                <div className="w-4 h-4 bg-friendly-yellow/30 border border-friendly-yellow rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>Vrije plek</span>
                <div className="w-4 h-4 border border-dashed border-verdigris bg-verdigris/10 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>Collision</span>
                <div className="w-4 h-4 border border-dashed border-red-500 bg-red-500/10 rounded"></div>
              </div>
              <span className="text-gray-400 mt-1">Grid: 50mm • Snap: 15mm • Kerf: {kerf}mm</span>
            </div>
          ) : (
            <>
              {/* Kleurlegenda per onderdeelgroep */}
              {colorMap && Object.keys(colorMap).length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {Object.entries(colorMap).slice(0, 8).map(([baseId, colors]) => (
                    <div key={baseId} className="flex items-center gap-1.5">
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                      />
                      <span className="text-xs text-gray-600">{baseId}</span>
                    </div>
                  ))}
                  {Object.keys(colorMap).length > 8 && (
                    <span className="text-xs text-gray-400">+{Object.keys(colorMap).length - 8} meer</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drag ghost */}
      {dragging && (() => {
        const ghostColors = colorMap ? getPartColor(dragging.part, colorMap) : partColors[(dragging.part.number - 1) % partColors.length]
        return (
          <div
            className="fixed pointer-events-none z-50 px-3 py-2 rounded-lg shadow-lg border-2 opacity-90"
            style={{
              left: dragPos.x + 12,
              top: dragPos.y + 12,
              backgroundColor: ghostColors.bg,
              borderColor: ghostColors.border,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-violet text-white rounded-full flex items-center justify-center text-xs font-bold">
                {dragging.part.number}
              </span>
              <div className="text-xs">
                <div className="font-medium">{dragging.part.name}</div>
                <div className="text-gray-500">{dragging.part.length}×{dragging.part.width}</div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Sheet SVG Component met forwardRef voor positie berekeningen
const SheetSVG = forwardRef(function SheetSVG({ 
  sheet, scale, padding, mode, compact = false, colorMap = null, isEdit = false, showGrid = false,
  selectedPart, onPartMouseDown, onPartClick, draggingPart, dropPreview 
}, ref) {
  const width = sheet.length * scale + padding * 2
  const height = mode === '2d' ? sheet.width * scale + padding * 2 : 80 + padding

  // Grid lijnen berekenen
  const gridLines = []
  if (showGrid && mode === '2d') {
    for (let x = 0; x <= sheet.length; x += GRID_SIZE) {
      gridLines.push({ type: 'v', pos: x })
    }
    for (let y = 0; y <= sheet.width; y += GRID_SIZE) {
      gridLines.push({ type: 'h', pos: y })
    }
  }

  return (
    <svg ref={ref} width={width} height={height} className="block">
      {/* Background */}
      <rect
        x={padding}
        y={padding}
        width={sheet.length * scale}
        height={mode === '2d' ? sheet.width * scale : 40}
        fill={sheet.isVirtual ? "#D1FAE5" : "#F9FAFB"}
        stroke={sheet.isVirtual ? "#10B981" : "#D1D5DB"}
        strokeWidth="2"
      />

      {/* Grid */}
      {showGrid && gridLines.map((line, i) => (
        line.type === 'v' ? (
          <line
            key={`grid-${i}`}
            x1={padding + line.pos * scale}
            y1={padding}
            x2={padding + line.pos * scale}
            y2={padding + sheet.width * scale}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray={line.pos % 100 === 0 ? "none" : "2 2"}
          />
        ) : (
          <line
            key={`grid-${i}`}
            x1={padding}
            y1={padding + line.pos * scale}
            x2={padding + sheet.length * scale}
            y2={padding + line.pos * scale}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray={line.pos % 100 === 0 ? "none" : "2 2"}
          />
        )
      ))}

      {/* Dimensions */}
      {!compact && (
        <>
          <g>
            <line x1={padding} y1={padding - 20} x2={padding + sheet.length * scale} y2={padding - 20} stroke="#9CA3AF" strokeWidth="1"/>
            <path d={`M ${padding} ${padding - 20} l 5 -4 l 0 8 z`} fill="#9CA3AF"/>
            <path d={`M ${padding + sheet.length * scale} ${padding - 20} l -5 -4 l 0 8 z`} fill="#9CA3AF"/>
            <text x={padding + (sheet.length * scale) / 2} y={padding - 28} textAnchor="middle" fill="#6B7280" fontSize="11">{sheet.length} mm</text>
          </g>
          {mode === '2d' && (
            <g>
              <line x1={padding - 20} y1={padding} x2={padding - 20} y2={padding + sheet.width * scale} stroke="#9CA3AF" strokeWidth="1"/>
              <path d={`M ${padding - 20} ${padding} l -4 5 l 8 0 z`} fill="#9CA3AF"/>
              <path d={`M ${padding - 20} ${padding + sheet.width * scale} l -4 -5 l 8 0 z`} fill="#9CA3AF"/>
              <text x={padding - 28} y={padding + (sheet.width * scale) / 2} textAnchor="middle" fill="#6B7280" fontSize="11" transform={`rotate(-90, ${padding - 28}, ${padding + (sheet.width * scale) / 2})`}>{sheet.width} mm</text>
            </g>
          )}
        </>
      )}

      {/* Drop preview */}
      {dropPreview && (
        <rect
          x={padding + Math.max(0, dropPreview.x) * scale}
          y={padding + Math.max(0, dropPreview.y) * scale}
          width={dropPreview.length * scale}
          height={dropPreview.width * scale}
          fill={dropPreview.collision ? "rgba(239, 68, 68, 0.15)" : "rgba(68, 182, 168, 0.15)"}
          stroke={dropPreview.collision ? "#EF4444" : "#44B6A8"}
          strokeWidth="2"
          strokeDasharray="6 3"
          rx="3"
        />
      )}

      {/* Parts */}
      {sheet.parts.map((part, idx) => {
        // Gebruik colorMap voor consistente kleuren per onderdeelgroep (split parts zelfde kleur)
        const colors = colorMap ? getPartColor(part, colorMap) : { bg: '#E5E7EB', border: '#6B7280', text: '#374151' }
        const x = padding + part.x * scale
        const y = padding + (mode === '2d' ? part.y * scale : 0)
        const w = part.length * scale
        const h = mode === '2d' ? part.width * scale : 40
        const isSelected = selectedPart?.number === part.number
        const isDragging = draggingPart?.number === part.number

        const boundary = parseBoundary(part.boundary)
        const holes = parseHoles(part.holes)
        const isComplex = boundary && boundary.length > 4

        return (
          <g 
            key={idx} 
            style={{ cursor: isEdit ? 'grab' : 'default', opacity: isDragging ? 0.3 : 1 }}
            onMouseDown={(e) => onPartMouseDown?.(e, part)}
            onClick={(e) => { e.stopPropagation(); onPartClick?.(part); }}
          >
            {isComplex ? (
              <>
                <path 
                  d={pointsToPath(boundary, scale, padding + part.x * scale, padding + part.y * scale)} 
                  fill={colors.bg} 
                  stroke={isSelected ? '#350E35' : colors.border} 
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {holes.map((hole, hIdx) => {
                  if (hole.type === 'circle') {
                    return <circle key={hIdx} cx={padding + (part.x + hole.cx) * scale} cy={padding + (part.y + hole.cy) * scale} r={(hole.d / 2) * scale} fill="#F9FAFB" stroke="#DB4C40" strokeWidth="1" strokeDasharray="3 2"/>
                  } else if (hole.type === 'poly') {
                    return <path key={hIdx} d={pointsToPath(hole.points, scale, padding + part.x * scale, padding + part.y * scale)} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
                  }
                  return null
                })}
              </>
            ) : (
              <rect x={x} y={y} width={w} height={h} fill={colors.bg} stroke={isSelected ? '#350E35' : colors.border} strokeWidth={isSelected ? 2.5 : 1.5} rx="2"/>
            )}

            <circle cx={x + (compact ? 8 : 12)} cy={y + (compact ? 8 : 12)} r={compact ? 6 : 10} fill="#350E35"/>
            <text x={x + (compact ? 8 : 12)} y={y + (compact ? 11 : 16)} textAnchor="middle" fill="white" fontSize={compact ? 7 : 10} fontWeight="600">{part.number}</text>

            {!compact && !isComplex && w > 60 && h > 30 && (
              <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fill={colors.text} fontSize="11" fontWeight="500">{part.length}×{part.width}</text>
            )}

            {!compact && !isComplex && w > 80 && h > 50 && (
              <text x={x + w / 2} y={y + h / 2 + 18} textAnchor="middle" fill="#6B7280" fontSize="9">
                {part.name.length > 14 ? part.name.slice(0, 14) + '...' : part.name}
              </text>
            )}

            {part.grain && !compact && (
              <g>
                <line x1={x + 4} y1={y + h - 8} x2={x + 20} y2={y + h - 8} stroke="#44B6A8" strokeWidth="2"/>
                <line x1={x + 4} y1={y + h - 12} x2={x + 20} y2={y + h - 12} stroke="#44B6A8" strokeWidth="2"/>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
})
