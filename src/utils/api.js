/**
 * API Service voor Zaagplan Optimizer Backend
 * Communiceert met de Python/OR-Tools backend
 */

// In development: localhost:8000, in productie: relatieve URL (nginx proxy)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const API_BASE = isDev ? 'http://localhost:8000' : ''

/**
 * Check of de backend beschikbaar is
 */
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) return { available: false, ortools: false }
    const data = await response.json()
    return {
      available: true,
      ortools: data.ortools_available,
      algorithms: data.algorithms_1d
    }
  } catch (error) {
    return { available: false, ortools: false, error: error.message }
  }
}

/**
 * Optimaliseer 1D zaagplan via backend (OR-Tools)
 * 
 * @param {Object} params
 * @param {Array} params.parts - [{id, length, quantity, stockType}]
 * @param {Array} params.stock - [{id, name, length, quantity}]
 * @param {number} params.kerf - Zaagsnede breedte
 * @param {string} params.algorithm - 'ortools_optimal' | 'ortools_fast' | 'ffd' | 'hybrid'
 * @param {number} params.maxSplitParts - Max delen per onderdeel
 * @param {number} params.jointAllowance - Extra lengte per verbinding
 */
export async function optimize1DBackend({ parts, stock, kerf, algorithm, maxSplitParts = 2, jointAllowance = 0 }) {
  console.log('=== BACKEND REQUEST START ===')
  console.log('Input parts:', parts)
  console.log('Input stock:', stock)
  
  // Converteer naar API format
  const requestBody = {
    parts: parts.map(p => ({
      id: String(p.id || p.name || 'unknown'),
      length: parseFloat(p.length) || 0,
      quantity: parseInt(p.quantity) || 1,
      label: String(p.name || p.id || 'part')
    })),
    stocks: stock.map(s => ({
      id: String(s.id || s.name || 'stock'),
      length: parseFloat(s.length) || 0,
      quantity: parseInt(s.quantity) || -1,
      label: String(s.name || `${s.length}mm`)
    })),
    kerf: parseFloat(kerf) || 3.0,
    algorithm: algorithm,
    max_split_parts: parseInt(maxSplitParts) || 2,
    joint_allowance: parseFloat(jointAllowance) || 0
  }

  console.log('Converted request body:', JSON.stringify(requestBody, null, 2))
  console.log('Parts count:', requestBody.parts.length)
  console.log('Stocks count:', requestBody.stocks.length)
  console.log('Sample part:', requestBody.parts[0])
  console.log('Sample stock:', requestBody.stocks[0])

  // Timeout na 30 seconden
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${API_BASE}/optimize/1d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

  if (!response.ok) {
      const errorData = await response.json()
      console.error('=== BACKEND ERROR ===')
      console.error('Status:', response.status)
      console.error('Error data:', errorData)
      console.error('Request was:', JSON.stringify(requestBody, null, 2))
      
      // Format error message
      let errorMsg = 'Backend optimalisatie mislukt'
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          errorMsg = errorData.detail.map(e => 
            `${e.loc?.join('.')}: ${e.msg}`
          ).join('\n')
        } else {
          errorMsg = JSON.stringify(errorData.detail)
        }
      }
      throw new Error(errorMsg)
    }

    const result = await response.json()
    console.log('Backend response:', result)
    
    // Converteer backend response naar frontend format
    return convertBackendResult(result, stock)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Backend timeout na 30 seconden')
    }
    throw error
  }
}

/**
 * Converteer backend resultaat naar frontend format
 */
function convertBackendResult(backendResult, originalStock) {
  const sheets = backendResult.plans.map((plan, index) => {
    // Bereken x-posities voor elke cut
    let currentX = 0
    const parts = plan.cuts.map((cut, cutIndex) => {
      const part = {
        id: cut.id,
        name: cut.id,
        length: cut.length,
        x: currentX,
        width: 40, // Standaard breedte voor 1D visualisatie
        number: cutIndex + 1
      }
      currentX += cut.length + 3 // + kerf
      return part
    })

    // Vind originele stock info
    const stockInfo = originalStock.find(s => s.id === plan.stock_id) || {}

    return {
      name: stockInfo.name || plan.stock_id,
      length: plan.stock_length,
      width: null,
      parts: parts,
      waste: plan.waste,
      efficiency: ((plan.stock_length - plan.waste) / plan.stock_length) * 100
    }
  })

  // Bereken totale efficiëntie
  const totalStockLength = sheets.reduce((sum, s) => sum + s.length, 0)
  const totalPartsLength = sheets.reduce((sum, s) => 
    sum + s.parts.reduce((pSum, p) => pSum + p.length, 0), 0)
  const avgEfficiency = totalStockLength > 0 
    ? (totalPartsLength / totalStockLength) * 100 
    : 0

  return {
    success: backendResult.parts_not_placed.length === 0,
    sheets: sheets,
    unplacedDetails: backendResult.parts_not_placed.map(p => ({
      ...p,
      reason: 'Te lang voor beschikbare voorraad'
    })),
    summary: {
      totalSheets: sheets.length,
      totalParts: sheets.reduce((sum, s) => sum + s.parts.length, 0),
      avgEfficiency: avgEfficiency,
      unplacedParts: backendResult.parts_not_placed.length
    },
    meta: {
      algorithm: backendResult.algorithm,
      computationTimeMs: backendResult.computation_time_ms,
      wastePercentage: backendResult.waste_percentage
    }
  }
}
