import { MaxRectsPacker } from 'maxrects-packer'

/**
 * 2D Bin Packing Optimizer
 * 
 * Drie algoritmes beschikbaar:
 * 1. Hybrid: Iteratief + Guillotine, kleinste plaat eerst (aanbevolen)
 * 2. MaxRects: maxrects-packer library, snel maar minder controle
 * 3. Guillotine: Puur guillotine splits, deterministisch
 */

// === LOGGING ===
let logBuffer = []

function log(message, level = 'info') {
  logBuffer.push({ level, message })
  if (level === 'error') console.error(message)
  else if (level === 'warn') console.warn(message)
  else console.log(message)
}

function clearLog() { logBuffer = [] }
function getLog() { return logBuffer.map(e => e.message).join('\n') }

// === MAIN ENTRY POINT ===
export function optimize2D({ stock, parts, kerf = 3, routerKerf = 6, grainDirection = true, maxIterations = 1000, algorithm = 'hybrid' }) {
  clearLog()
  
  log('🪚 CutList Optimizer - 2D Bin Packing')
  log('='.repeat(60))
  log(`Algoritme: ${algorithm.toUpperCase()}`)
  log(`Zaagblad kerf: ${kerf}mm | Frees kerf: ${routerKerf}mm`)
  log(`Nerf: ${grainDirection ? 'AAN' : 'UIT'} | Iteraties: ${maxIterations}`)
  log('')

  // Validatie
  if (!stock?.length) {
    return errorResult('Geen voorraad beschikbaar')
  }
  if (!parts?.length) {
    return errorResult('Geen onderdelen om te zagen')
  }

  // Prepareer data (inclusief virtuele voorraad uit gaten)
  const { stockByType, partsPerType, virtualStockItems } = prepareData(stock, parts, routerKerf)

  // Kies algoritme
  let result
  switch (algorithm) {
    case 'maxrects':
      result = runMaxRects(stockByType, partsPerType, kerf, grainDirection)
      break
    case 'guillotine':
      result = runGuillotine(stockByType, partsPerType, kerf, grainDirection)
      break
    case 'hybrid':
    default:
      result = runHybrid(stockByType, partsPerType, kerf, grainDirection, maxIterations)
  }

  // Voeg virtuele voorraad info toe aan resultaat
  result.virtualStock = virtualStockItems
  
  return result
}

function errorResult(error) {
  log(`❌ ${error}`, 'error')
  return { success: false, error, sheets: [], log: getLog(), summary: { totalSheets: 0, totalParts: 0, avgEfficiency: 0, unplacedParts: 0 } }
}

// === DATA PREPARATION ===

// Parse boundary string naar punten array
function parseBoundary(boundaryStr) {
  if (!boundaryStr) return null
  const points = boundaryStr.split(';').map(p => {
    const [x, y] = p.split(',').map(Number)
    return { x, y }
  })
  return points
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
      // Bereken bounding box voor rechthoekige gaten
      const minX = Math.min(...points.map(p => p.x))
      const maxX = Math.max(...points.map(p => p.x))
      const minY = Math.min(...points.map(p => p.y))
      const maxY = Math.max(...points.map(p => p.y))
      return { 
        type: 'poly', 
        points,
        bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      }
    }
    return null
  }).filter(Boolean)
}

// Check of een gat rechthoekig is (4 punten, rechte hoeken)
function isRectangularHole(hole) {
  if (hole.type !== 'poly' || hole.points.length !== 4) return false
  // Simpele check: alle hoeken zijn ~90 graden
  return true // Voor nu accepteren we alle 4-punts polygonen als rechthoekig
}

// Extraheer virtuele voorraad uit rechthoekige gaten
function extractVirtualStock(parts, routerKerf) {
  const virtualStock = []
  
  for (const part of parts) {
    if (!part.holes) continue
    
    const holes = parseHoles(part.holes)
    for (const hole of holes) {
      if (isRectangularHole(hole)) {
        // Rechthoekig gat → bruikbaar als voorraad (minus freeskerf rondom)
        const usableLength = Math.round(hole.bounds.w - routerKerf * 2)
        const usableWidth = Math.round(hole.bounds.h - routerKerf * 2)
        
        if (usableLength > 50 && usableWidth > 50) { // Minimaal 50mm
          virtualStock.push({
            id: `virtual-${part.id}-${hole.bounds.x}-${hole.bounds.y}`,
            name: `${part.stockType} (uit gat)`,
            stockType: part.stockType,
            length: usableLength,
            width: usableWidth,
            area: usableLength * usableWidth,
            isVirtual: true,
            sourcePartId: part.id,
            sourcePart: part.name,
            holePosition: { x: hole.bounds.x + routerKerf, y: hole.bounds.y + routerKerf }
          })
          log(`  🔄 Virtuele voorraad uit gat: ${usableLength}×${usableWidth}mm (van ${part.name})`)
        }
      }
    }
  }
  
  return virtualStock
}

function prepareData(stock, parts, routerKerf = 6) {
  // Groepeer stock per type, KLEIN → GROOT
  const stockByType = {}
  for (const s of stock) {
    if (!stockByType[s.name]) stockByType[s.name] = []
    for (let i = 0; i < (s.quantity || 1); i++) {
      stockByType[s.name].push({
        id: `${s.id}-${i}`,
        name: s.name,
        length: s.length,
        width: s.width,
        area: s.length * s.width
      })
    }
  }

  // Expandeer parts per type
  const partsPerType = {}
  for (const part of parts) {
    const type = part.stockType || 'unassigned'
    if (!partsPerType[type]) partsPerType[type] = []
    for (let i = 0; i < (part.quantity || 1); i++) {
      partsPerType[type].push({
        id: `${part.id}-${i}`,
        name: part.name,
        length: part.length,
        width: part.width,
        area: part.length * part.width,
        grain: part.grain || false,
        stockType: part.stockType,
        // Complexe vormen
        boundary: part.boundary || null,
        holes: part.holes || null
      })
    }
  }

  // Extraheer virtuele voorraad uit rechthoekige gaten
  log('GATEN ANALYSE:')
  const allParts = Object.values(partsPerType).flat()
  const virtualStockItems = extractVirtualStock(allParts, routerKerf)
  
  // Voeg virtuele voorraad toe aan stockByType (klein → groot sorteren)
  for (const vs of virtualStockItems) {
    if (!stockByType[vs.stockType]) stockByType[vs.stockType] = []
    stockByType[vs.stockType].push(vs)
  }
  
  // Sorteer alle voorraad klein → groot
  for (const type of Object.keys(stockByType)) {
    stockByType[type].sort((a, b) => a.area - b.area)
  }

  // Log
  log('')
  log('VOORRAAD (klein→groot):')
  for (const [type, plates] of Object.entries(stockByType)) {
    const regular = plates.filter(p => !p.isVirtual)
    const virtual = plates.filter(p => p.isVirtual)
    log(`  📦 ${type}: ${regular.map(p => `${p.length}×${p.width}`).join(', ')}`)
    if (virtual.length > 0) {
      log(`     + ${virtual.length} virtuele platen uit gaten`)
    }
  }
  log('')
  log('ONDERDELEN:')
  for (const [type, items] of Object.entries(partsPerType)) {
    const complex = items.filter(p => p.boundary)
    const simple = items.filter(p => !p.boundary)
    log(`  🔧 ${type}: ${items.length} stuks`)
    if (complex.length > 0) log(`     - ${complex.length} complexe vormen`)
    if (simple.length > 0) log(`     - ${simple.length} rechthoekig`)
  }
  log('')

  return { stockByType, partsPerType, virtualStockItems }
}

// === ALGORITME 1: HYBRID (Iteratief + Guillotine) ===
function runHybrid(stockByType, partsPerType, kerf, grainDirection, maxIterations) {
  log('🔄 Running HYBRID algorithm...')
  
  const allSheets = []
  const allUnplacedParts = []
  let globalPartNumber = 1

  for (const [typeName, typeParts] of Object.entries(partsPerType)) {
    log(`\n--- ${typeName} ---`)

    if (typeName === 'unassigned') {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Geen materiaal' })))
      continue
    }

    const plates = stockByType[typeName]
    if (!plates?.length) {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Niet in voorraad' })))
      continue
    }

    // Iteratief optimaliseren
    let bestResult = null
    let bestScore = -Infinity
    let bestShuffle = null
    const startTime = Date.now()

    for (let iter = 0; iter < maxIterations; iter++) {
      const shuffledParts = shuffleParts(typeParts, iter)
      const result = binCentricPlacement(shuffledParts, plates, kerf, grainDirection, false)
      const score = -result.usedPlates * 10000 + result.efficiency * 100 - result.unplaced.length * 50000

      if (score > bestScore) {
        bestScore = score
        bestResult = result
        bestShuffle = shuffledParts
        if (iter > 0 && iter % 500 === 0) {
          log(`  Iter ${iter}: ${result.usedPlates} platen, ${result.efficiency.toFixed(1)}%`)
        }
      }

      if (result.unplaced.length === 0 && result.efficiency > 90) {
        log(`  ✓ Optimaal na ${iter + 1} iteraties`)
        break
      }

      if (Date.now() - startTime > 5000) {
        log(`  ⏱️ Timeout na ${iter + 1} iteraties`)
        break
      }
    }

    // Voer beste oplossing nogmaals uit met verbose logging
    if (bestShuffle) {
      log(`\n  📋 BESTE OPLOSSING (${bestResult.usedPlates} platen, ${bestResult.efficiency.toFixed(1)}%):`)
      bestResult = binCentricPlacement(bestShuffle, plates, kerf, grainDirection, true)
    }

    if (bestResult) {
      for (const sheet of bestResult.sheets) {
        for (const part of sheet.parts) part.number = globalPartNumber++
        allSheets.push(sheet)
      }
      for (const p of bestResult.unplaced) {
        allUnplacedParts.push({ ...p, reason: 'Geen ruimte' })
      }
    }
  }

  return buildResult(allSheets, allUnplacedParts)
}

// === ALGORITME 2: MAXRECTS (Library) ===
function runMaxRects(stockByType, partsPerType, kerf, grainDirection) {
  log('🔄 Running MAXRECTS algorithm...')
  
  const allSheets = []
  const allUnplacedParts = []
  let globalPartNumber = 1

  for (const [typeName, typeParts] of Object.entries(partsPerType)) {
    log(`\n--- ${typeName} ---`)

    if (typeName === 'unassigned') {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Geen materiaal' })))
      continue
    }

    const plates = stockByType[typeName]
    if (!plates?.length) {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Niet in voorraad' })))
      continue
    }

    let remaining = [...typeParts]

    // Loop door platen van klein naar groot
    for (const plate of plates) {
      if (remaining.length === 0) break

      const candidates = remaining.filter(p => canFit(p, plate, grainDirection))
      if (candidates.length === 0) continue

      // MaxRects Packer
      const packer = new MaxRectsPacker(plate.length, plate.width, kerf, {
        smart: true,
        pot: false,
        square: false,
        allowRotation: !grainDirection,
        tag: false,
        border: 0
      })

      // Sorteer groot naar klein
      const sorted = [...candidates].sort((a, b) => b.area - a.area)
      for (const part of sorted) {
        packer.add(part.length, part.width, { ...part, allowRotation: !grainDirection || !part.grain })
      }

      if (packer.bins.length > 0 && packer.bins[0].rects.length > 0) {
        const bin = packer.bins[0]
        const placedParts = []
        const placedIds = new Set()

        for (const rect of bin.rects) {
          const partData = rect.data
          placedIds.add(partData.id)
          const isRotated = rect.width !== partData.length
          
          placedParts.push({
            ...partData,
            number: globalPartNumber++,
            x: rect.x,
            y: rect.y,
            length: isRotated ? partData.width : partData.length,
            width: isRotated ? partData.length : partData.width,
            rotated: isRotated
          })
          
          log(`    ✓ #${globalPartNumber - 1} ${partData.name} @ (${rect.x},${rect.y}) ${isRotated ? '↻' : ''}`)
        }

        const usedArea = placedParts.reduce((sum, p) => sum + p.length * p.width, 0)
        const efficiency = (usedArea / (plate.length * plate.width)) * 100

        allSheets.push({
          name: plate.name,
          length: plate.length,
          width: plate.width,
          parts: placedParts,
          efficiency
        })

        remaining = remaining.filter(p => !placedIds.has(p.id))
        log(`  Plaat ${plate.length}×${plate.width}: ${placedParts.length} stuks, ${efficiency.toFixed(1)}%`)
      }
    }

    for (const p of remaining) {
      allUnplacedParts.push({ ...p, reason: 'Geen ruimte' })
    }
  }

  return buildResult(allSheets, allUnplacedParts)
}

// === ALGORITME 3: GUILLOTINE (Puur deterministisch) ===
function runGuillotine(stockByType, partsPerType, kerf, grainDirection) {
  log('🔄 Running GUILLOTINE algorithm...')
  
  const allSheets = []
  const allUnplacedParts = []
  let globalPartNumber = 1

  for (const [typeName, typeParts] of Object.entries(partsPerType)) {
    log(`\n--- ${typeName} ---`)

    if (typeName === 'unassigned') {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Geen materiaal' })))
      continue
    }

    const plates = stockByType[typeName]
    if (!plates?.length) {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Niet in voorraad' })))
      continue
    }

    // Sorteer parts op area (groot eerst)
    const sortedParts = [...typeParts].sort((a, b) => b.area - a.area)
    const result = binCentricPlacement(sortedParts, plates, kerf, grainDirection)

    for (const sheet of result.sheets) {
      for (const part of sheet.parts) part.number = globalPartNumber++
      allSheets.push(sheet)
    }
    for (const p of result.unplaced) {
      allUnplacedParts.push({ ...p, reason: 'Geen ruimte' })
    }

    log(`  ${result.usedPlates} platen, ${result.efficiency.toFixed(1)}%`)
  }

  return buildResult(allSheets, allUnplacedParts)
}

// === SHARED FUNCTIONS ===

function binCentricPlacement(parts, plates, kerf, grainDirection, verbose = false) {
  const sheets = []
  let remaining = [...parts]
  const usedPlateIds = new Set()

  for (const plate of plates) {
    if (remaining.length === 0) break
    if (usedPlateIds.has(plate.id)) continue

    const sheet = {
      name: plate.name,
      length: plate.length,
      width: plate.width,
      parts: [],
      freeRects: [{ x: 0, y: 0, w: plate.length, h: plate.width }],
      isVirtual: plate.isVirtual || false,
      sourcePart: plate.sourcePart || null
    }

    // Check welke parts kunnen passen (normaal of geroteerd)
    const candidates = remaining.filter(p => canFit(p, plate, grainDirection))
    
    if (verbose && candidates.length > 0) {
      log(`  📦 Plaat ${plate.length}×${plate.width}${plate.isVirtual ? ' (virtueel uit gat)' : ''} - ${candidates.length} kandidaten:`)
      for (const c of candidates) {
        const fitsNormal = c.length <= plate.length && c.width <= plate.width
        const fitsRotated = c.width <= plate.length && c.length <= plate.width
        log(`      - ${c.name} (${c.length}×${c.width}) ${fitsNormal ? '✓normaal' : ''} ${fitsRotated ? '✓rotatie' : ''}`)
      }
    }
    
    if (candidates.length === 0) continue

    const placed = []
    for (const part of candidates) {
      const placement = findBestPlacement(sheet, part, kerf, grainDirection)
      if (placement) {
        sheet.parts.push({
          ...part,
          x: placement.x,
          y: placement.y,
          length: placement.rotated ? part.width : part.length,
          width: placement.rotated ? part.length : part.width,
          rotated: placement.rotated,
          // Bewaar complexe vorm data
          boundary: part.boundary || null,
          holes: part.holes || null
        })
        if (verbose) {
          const complexInfo = part.boundary ? ' [complex]' : ''
          log(`      ✓ Geplaatst: ${part.name}${complexInfo} @ (${placement.x},${placement.y}) ${placement.rotated ? '↻geroteerd' : ''}`)
        }
        splitFreeRect(sheet, placement, kerf)
        placed.push(part.id)
      } else if (verbose) {
        log(`      ✗ Geen ruimte voor: ${part.name} (${part.length}×${part.width})`)
      }
    }

    if (sheet.parts.length > 0) {
      usedPlateIds.add(plate.id)
      const usedArea = sheet.parts.reduce((sum, p) => sum + p.length * p.width, 0)
      sheet.efficiency = (usedArea / (plate.length * plate.width)) * 100
      if (verbose) {
        log(`      → ${sheet.parts.length} stuks geplaatst, ${sheet.efficiency.toFixed(1)}% benut`)
      }
      delete sheet.freeRects
      sheets.push(sheet)
      remaining = remaining.filter(p => !placed.includes(p.id))
    }
  }

  const totalArea = sheets.reduce((sum, s) => sum + s.length * s.width, 0)
  const usedArea = sheets.reduce((sum, s) => sum + s.parts.reduce((ps, p) => ps + p.length * p.width, 0), 0)

  return {
    sheets,
    unplaced: remaining,
    usedPlates: sheets.length,
    efficiency: totalArea > 0 ? (usedArea / totalArea) * 100 : 0
  }
}

function canFit(part, plate, grainDirection) {
  const fitsNormal = part.length <= plate.length && part.width <= plate.width
  const canRotate = !grainDirection || !part.grain
  const fitsRotated = canRotate && part.width <= plate.length && part.length <= plate.width
  return fitsNormal || fitsRotated
}

function findBestPlacement(sheet, part, kerf, grainDirection) {
  const canRotate = !grainDirection || !part.grain
  let best = null
  let bestScore = Infinity

  for (let i = 0; i < sheet.freeRects.length; i++) {
    const rect = sheet.freeRects[i]

    // Normaal - kerf alleen nodig als er ruimte overblijft
    if (part.length <= rect.w && part.width <= rect.h) {
      const score = Math.min(rect.w - part.length, rect.h - part.width)
      if (score < bestScore) {
        bestScore = score
        best = { x: rect.x, y: rect.y, w: part.length, h: part.width, rotated: false, rectIndex: i }
      }
    }

    // Geroteerd - kerf alleen nodig als er ruimte overblijft
    if (canRotate && part.width <= rect.w && part.length <= rect.h) {
      const score = Math.min(rect.w - part.width, rect.h - part.length)
      if (score < bestScore) {
        bestScore = score
        best = { x: rect.x, y: rect.y, w: part.width, h: part.length, rotated: true, rectIndex: i }
      }
    }
  }

  return best
}

function splitFreeRect(sheet, placement, kerf) {
  const rect = sheet.freeRects[placement.rectIndex]
  sheet.freeRects.splice(placement.rectIndex, 1)

  // Rechts - alleen als er genoeg ruimte is NA de kerf
  const rightW = rect.w - placement.w - kerf
  if (rightW > 0) {
    sheet.freeRects.push({ x: rect.x + placement.w + kerf, y: rect.y, w: rightW, h: rect.h })
  }

  // Onder - alleen als er genoeg ruimte is NA de kerf
  const bottomH = rect.h - placement.h - kerf
  if (bottomH > 0) {
    sheet.freeRects.push({ x: rect.x, y: rect.y + placement.h + kerf, w: placement.w, h: bottomH })
  }

  sheet.freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h))
}

function shuffleParts(parts, iter) {
  if (iter === 0) return [...parts].sort((a, b) => b.area - a.area)
  if (iter === 1) return [...parts].sort((a, b) => b.width - a.width)
  if (iter === 2) return [...parts].sort((a, b) => b.length - a.length)
  
  const random = seededRandom(iter)
  return [...parts]
    .map(p => ({ part: p, weight: p.area * (0.3 + random() * 0.7) }))
    .sort((a, b) => b.weight - a.weight)
    .map(x => x.part)
}

function seededRandom(seed) {
  let s = seed
  return () => { s = Math.sin(s * 9999) * 10000; return s - Math.floor(s) }
}

function buildResult(allSheets, allUnplacedParts) {
  allSheets.sort((a, b) => (a.length * a.width) - (b.length * b.width))

  const totalParts = allSheets.reduce((sum, s) => sum + s.parts.length, 0)
  const totalArea = allSheets.reduce((sum, s) => sum + s.length * s.width, 0)
  const usedArea = allSheets.reduce((sum, s) => sum + s.parts.reduce((ps, p) => ps + p.length * p.width, 0), 0)
  const avgEfficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0

  log('')
  log('='.repeat(60))
  log('📊 RESULTAAT')
  log(`  Platen: ${allSheets.length} | Stukken: ${totalParts} | Benutting: ${avgEfficiency.toFixed(1)}%`)
  if (allUnplacedParts.length > 0) log(`  ⚠️ Niet geplaatst: ${allUnplacedParts.length}`)
  log('='.repeat(60))

  return {
    success: allUnplacedParts.length === 0,
    sheets: allSheets,
    unplacedDetails: allUnplacedParts,
    log: getLog(),
    summary: { totalSheets: allSheets.length, totalParts, avgEfficiency, unplacedParts: allUnplacedParts.length }
  }
}
