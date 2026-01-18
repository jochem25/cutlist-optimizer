/**
 * 1D Cutting Stock Optimizer
 * Ondersteunt meerdere algoritmes: FFD, Best-Fit, Hybrid
 * 
 * Parts worden gekoppeld aan materiaal TYPE (naam), niet specifieke balk
 * Algoritme kiest automatisch beste balk-lengte per onderdeel
 * Lange onderdelen worden gesplitst indien nodig
 *
 * @param {Object} input
 * @param {Array} input.stock - Beschikbare balken [{id, name, length, quantity}]
 * @param {Array} input.parts - Te zagen stukken [{id, name, length, quantity, stockType}]
 * @param {number} input.kerf - Zaagblad dikte in mm
 * @param {number} input.maxSplitParts - Max aantal delen per onderdeel (1-5)
 * @param {number} input.jointAllowance - Extra lengte per verbinding in mm
 * @param {string} input.algorithm - Algoritme: 'ffd', 'bestfit', 'hybrid'
 * @returns {Object} Optimalisatie resultaat
 */
export function optimize1D({ stock, parts, kerf = 3, maxSplitParts = 2, jointAllowance = 0, algorithm = 'ffd' }) {
  // Validatie
  if (!stock || stock.length === 0) {
    return {
      success: false,
      error: 'Geen voorraad beschikbaar',
      sheets: [],
      summary: { totalSheets: 0, totalParts: 0, avgEfficiency: 0, unplacedParts: 0 }
    }
  }

  if (!parts || parts.length === 0) {
    return {
      success: false,
      error: 'Geen onderdelen om te zagen',
      sheets: [],
      summary: { totalSheets: 0, totalParts: 0, avgEfficiency: 0, unplacedParts: 0 }
    }
  }

  // Groepeer stock per materiaal naam (type)
  const stockByType = {}
  for (const s of stock) {
    if (!stockByType[s.name]) {
      stockByType[s.name] = []
    }
    // Voeg elke balk individueel toe (expand quantity)
    const qty = s.quantity || 1
    for (let i = 0; i < qty; i++) {
      stockByType[s.name].push({
        id: `${s.id}-${i}`,
        name: s.name,
        length: s.length,
        available: true
      })
    }
  }

  // Sorteer balken per type: kortste eerst (voor optimale fit)
  for (const type of Object.keys(stockByType)) {
    stockByType[type].sort((a, b) => a.length - b.length)
  }

  // Groepeer parts per materiaal type
  const partsPerType = {}
  for (const part of parts) {
    const type = part.stockType || 'unassigned'
    if (!partsPerType[type]) {
      partsPerType[type] = []
    }
    const qty = part.quantity || 1
    for (let i = 0; i < qty; i++) {
      partsPerType[type].push({
        id: part.id,
        name: part.name,
        length: part.length,
        stockType: part.stockType,
        originalId: part.id
      })
    }
  }

  const allSheets = []
  const allUnplacedParts = []
  let globalPartNumber = 1

  // Optimaliseer per materiaal type
  for (const [typeName, typeParts] of Object.entries(partsPerType)) {
    if (typeName === 'unassigned') {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: 'Geen materiaal toegewezen' })))
      continue
    }

    const availableStock = stockByType[typeName]
    if (!availableStock || availableStock.length === 0) {
      allUnplacedParts.push(...typeParts.map(p => ({ ...p, reason: `Materiaal "${typeName}" niet in voorraad` })))
      continue
    }

    // Sorteer parts van groot naar klein (FFD)
    const sortedParts = [...typeParts].sort((a, b) => b.length - a.length)

    // Check of grootste stuk past, anders splitsen indien toegestaan
    const maxPartLength = sortedParts[0]?.length || 0
    const maxStockLength = Math.max(...availableStock.map(s => s.length))

    // Verwerk parts - splits indien nodig
    const processedParts = []
    for (const part of sortedParts) {
      if (part.length <= maxStockLength) {
        // Past op één stuk
        processedParts.push({ ...part, splitPart: null, splitTotal: null })
      } else if (maxSplitParts > 1) {
        // Moet gesplitst worden
        const splitResult = splitPart(part, maxStockLength, maxSplitParts, jointAllowance)
        if (splitResult.success) {
          processedParts.push(...splitResult.parts)
        } else {
          allUnplacedParts.push({
            ...part,
            reason: splitResult.reason
          })
        }
      } else {
        // Splitsen niet toegestaan
        allUnplacedParts.push({
          ...part,
          reason: `Te lang voor ${typeName} (max ${maxStockLength}mm), splitsen uitgeschakeld`
        })
      }
    }

    // Active bins (balken die al stukken bevatten)
    const bins = []
    
    // Drempelwaarde voor "groot" onderdeel bij hybrid (60% van langste voorraad)
    const largePartThreshold = maxStockLength * 0.6

    for (const part of processedParts) {
      let placed = false

      // ALGORITME SELECTIE
      if (algorithm === 'hybrid' && part.length >= largePartThreshold) {
        // HYBRID: Grote stukken direct op nieuwe balk
        for (const stockItem of availableStock) {
          if (!stockItem.available) continue
          if (stockItem.length >= part.length) {
            stockItem.available = false
            bins.push({
              stockId: stockItem.id,
              stockName: stockItem.name,
              stockLength: stockItem.length,
              parts: [{
                ...part,
                number: globalPartNumber++,
                x: 0,
                width: 40
              }]
            })
            placed = true
            break
          }
        }
      } else {
        // FFD, BESTFIT, of kleine stukken bij HYBRID
        // STAP 1: Probeer te plaatsen op bestaande balken
        let binsByFit = [...bins]
          .map((bin, index) => ({ bin, index, remaining: bin.stockLength - calculateUsedLength(bin.parts, kerf) }))
          .filter(b => {
            const requiredLength = b.bin.parts.length > 0 ? part.length + kerf : part.length
            return requiredLength <= b.remaining
          })

        // Sorteer afhankelijk van algoritme
        if (algorithm === 'bestfit' || algorithm === 'hybrid') {
          // Best-Fit: kleinste resterende ruimte eerst
          binsByFit.sort((a, b) => a.remaining - b.remaining)
        } else {
          // FFD: eerste beschikbare (niet sorteren, of op volgorde van aanmaak)
          // Geen extra sortering nodig
        }

        for (const { bin } of binsByFit) {
          const usedLength = calculateUsedLength(bin.parts, kerf)
          const x = usedLength + (bin.parts.length > 0 ? kerf : 0)
          
          bin.parts.push({
            ...part,
            number: globalPartNumber++,
            x: x,
            width: 40
          })
          placed = true
          break
        }

        // STAP 2: Als niet geplaatst, zoek kleinste nieuwe balk die past
        if (!placed) {
          for (const stockItem of availableStock) {
            if (!stockItem.available) continue
            if (stockItem.length >= part.length) {
              stockItem.available = false

              bins.push({
                stockId: stockItem.id,
                stockName: stockItem.name,
                stockLength: stockItem.length,
                parts: [{
                  ...part,
                  number: globalPartNumber++,
                  x: 0,
                  width: 40
                }]
              })
              placed = true
              break
            }
          }
        }
      }

      if (!placed) {
        allUnplacedParts.push({
          ...part,
          reason: `Geen ruimte meer op ${typeName}`
        })
      }
    }

    // Converteer bins naar sheets
    for (const bin of bins) {
      const usedLength = bin.parts.reduce((sum, p) => sum + p.length, 0)
      const kerfLength = Math.max(0, (bin.parts.length - 1) * kerf)
      const totalUsed = usedLength + kerfLength
      const waste = bin.stockLength - totalUsed
      const efficiency = (usedLength / bin.stockLength) * 100

      allSheets.push({
        name: bin.stockName,
        length: bin.stockLength,
        width: null,
        parts: bin.parts,
        waste: waste,
        efficiency: efficiency
      })
    }
  }

  // Sorteer sheets: meest gevulde eerst
  allSheets.sort((a, b) => b.efficiency - a.efficiency)

  // Totale statistieken
  const totalStockLength = allSheets.reduce((sum, s) => sum + s.length, 0)
  const totalPartsLength = allSheets.reduce((sum, s) =>
    sum + s.parts.reduce((pSum, p) => pSum + p.length, 0), 0)
  const totalEfficiency = totalStockLength > 0
    ? (totalPartsLength / totalStockLength) * 100
    : 0

  return {
    success: allUnplacedParts.length === 0,
    sheets: allSheets,
    unplacedDetails: allUnplacedParts,
    summary: {
      totalSheets: allSheets.length,
      totalParts: globalPartNumber - 1,
      avgEfficiency: totalEfficiency,
      unplacedParts: allUnplacedParts.length
    }
  }
}

/**
 * Bereken gebruikte lengte inclusief zaagsneden
 */
function calculateUsedLength(parts, kerf) {
  if (parts.length === 0) return 0
  const partsLength = parts.reduce((sum, p) => sum + p.length, 0)
  const kerfLength = (parts.length - 1) * kerf
  return partsLength + kerfLength
}

/**
 * Sorteer stukken van groot naar klein (voor FFD)
 */
export function sortByLengthDesc(parts) {
  return [...parts].sort((a, b) => b.length - a.length)
}

/**
 * Splits een te lang onderdeel in meerdere delen
 * @param {Object} part - Het onderdeel dat gesplitst moet worden
 * @param {number} maxLength - Maximale lengte per deel (langste beschikbare voorraad)
 * @param {number} maxParts - Maximum aantal delen
 * @param {number} jointAllowance - Extra lengte per verbinding
 * @returns {Object} { success, parts[], reason }
 */
function splitPart(part, maxLength, maxParts, jointAllowance) {
  const originalLength = part.length
  
  // Bereken minimaal aantal delen nodig
  // Formule: totaal = (n * deelLengte) + ((n-1) * jointAllowance)
  // Dus: deelLengte = (totaal - (n-1) * jointAllowance) / n
  let numParts = 1
  while (numParts <= maxParts) {
    const totalJointAllowance = (numParts - 1) * jointAllowance
    const partLengthNeeded = (originalLength + totalJointAllowance) / numParts
    
    if (partLengthNeeded <= maxLength) {
      break
    }
    numParts++
  }
  
  // Check of het lukt binnen maxParts
  if (numParts > maxParts) {
    const minPartsNeeded = Math.ceil(originalLength / maxLength)
    return {
      success: false,
      parts: [],
      reason: `Minimaal ${minPartsNeeded} delen nodig, max ${maxParts} toegestaan`
    }
  }
  
  // Bereken de daadwerkelijke deel-lengtes (inclusief joint allowance per deel)
  const totalJointAllowance = (numParts - 1) * jointAllowance
  const totalLengthNeeded = originalLength + totalJointAllowance
  const partLength = Math.ceil(totalLengthNeeded / numParts)
  
  // Genereer de gesplitste delen
  const splitParts = []
  let remainingLength = originalLength
  
  for (let i = 0; i < numParts; i++) {
    // Laatste deel krijgt de rest
    const isLast = i === numParts - 1
    const thisPartLength = isLast ? remainingLength : partLength
    
    // Voeg jointAllowance toe aan niet-laatste delen
    const lengthWithJoint = isLast ? thisPartLength : thisPartLength + jointAllowance
    
    splitParts.push({
      ...part,
      id: `${part.id}-split-${i + 1}`,
      name: `${part.name} (${i + 1}/${numParts})`,
      length: Math.min(lengthWithJoint, maxLength),
      originalLength: originalLength,
      splitPart: i + 1,
      splitTotal: numParts
    })
    
    remainingLength -= thisPartLength
  }
  
  return {
    success: true,
    parts: splitParts,
    reason: null
  }
}
