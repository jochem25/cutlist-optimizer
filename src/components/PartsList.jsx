import { useState } from 'react'

/**
 * PartsList Component
 * Beheer onderdelen die gezaagd moeten worden
 * 
 * stockType = materiaal naam (bijv. "Multiplex 18mm")
 * Algoritme kiest automatisch de beste plaat-maat
 */
export default function PartsList({ mode, parts, setParts, grainDirection, stock }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newPart, setNewPart] = useState({
    name: '',
    length: 800,
    width: 400,
    quantity: 1,
    grain: false,
    stockType: null  // Materiaal naam, niet specifieke plaat
  })

  // Haal unieke materiaal types op (gegroepeerd op naam)
  const getUniqueStockTypes = () => {
    const types = {}
    for (const s of stock) {
      if (!types[s.name]) {
        types[s.name] = {
          name: s.name,
          totalQuantity: s.quantity,
          sizes: [`${s.length}×${s.width || ''}`]
        }
      } else {
        types[s.name].totalQuantity += s.quantity
        types[s.name].sizes.push(`${s.length}×${s.width || ''}`)
      }
    }
    return Object.values(types)
  }

  const stockTypes = getUniqueStockTypes()

  const handleAdd = () => {
    if (!newPart.name.trim()) return
    if (!newPart.stockType && stock.length > 0) {
      alert('Selecteer eerst een materiaal type')
      return
    }

    const part = {
      id: Date.now(),
      name: newPart.name,
      length: newPart.length,
      width: mode === '2d' ? newPart.width : null,
      quantity: newPart.quantity,
      grain: mode === '2d' && grainDirection ? newPart.grain : false,
      stockType: newPart.stockType  // Materiaal naam
    }

    setParts([...parts, part])
    setNewPart({ name: '', length: 800, width: 400, quantity: 1, grain: false, stockType: stockTypes[0]?.name || null })
    setIsAdding(false)
  }

  const handleRemove = (id) => {
    setParts(parts.filter(part => part.id !== id))
  }

  const handleQuantityChange = (id, delta) => {
    setParts(parts.map(part =>
      part.id === id
        ? { ...part, quantity: Math.max(1, part.quantity + delta) }
        : part
    ))
  }

  const handleStockTypeChange = (id, stockType) => {
    setParts(parts.map(part =>
      part.id === id
        ? { ...part, stockType: stockType }
        : part
    ))
  }

  const toggleGrain = (id) => {
    setParts(parts.map(part =>
      part.id === id
        ? { ...part, grain: !part.grain }
        : part
    ))
  }

  const getStockColor = (stockType) => {
    const index = stockTypes.findIndex(s => s.name === stockType)
    const colors = ['bg-violet/10 text-violet', 'bg-verdigris/10 text-verdigris', 'bg-friendly-yellow/20 text-yellow-700', 'bg-flaming-peach/10 text-flaming-peach']
    return colors[index % colors.length] || 'bg-gray-100 text-gray-600'
  }

  const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0)

  // Set default stockType when stock changes
  if (stockTypes.length > 0 && newPart.stockType === null) {
    setNewPart(prev => ({ ...prev, stockType: stockTypes[0].name }))
  }

  // Bepaal grid template op basis van mode en grain
  const getGridClass = () => {
    if (mode === '2d' && grainDirection) {
      return 'grid-cols-[minmax(80px,1fr)_50px_50px_64px_32px_24px]'
    } else if (mode === '2d') {
      return 'grid-cols-[minmax(80px,1fr)_50px_50px_64px_24px]'
    } else {
      return 'grid-cols-[minmax(80px,1fr)_60px_64px_24px]'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-violet flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
          </svg>
          Onderdelen
          {totalParts > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-verdigris/10 text-verdigris rounded-full">
              {totalParts} stuks
            </span>
          )}
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          disabled={stock.length === 0}
          className={`text-xs font-medium flex items-center gap-1 ${
            stock.length === 0 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-verdigris hover:text-verdigris-light'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Toevoegen
        </button>
      </div>

      {stock.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
          Voeg eerst voorraad toe voordat je onderdelen kunt toevoegen.
        </p>
      )}

      {/* Parts table */}
      {parts.length > 0 && (
        <div className="border border-gray-200 rounded overflow-hidden text-xs">
          {/* Header */}
          <div className={`grid ${getGridClass()} gap-1 px-2 py-1.5 bg-gray-100 font-medium text-gray-500 uppercase tracking-wide items-center`}>
            <div>Naam</div>
            <div className="text-right">L</div>
            {mode === '2d' && <div className="text-right">B</div>}
            <div className="text-center">Aantal</div>
            {mode === '2d' && grainDirection && <div className="text-center">Nerf</div>}
            <div></div>
          </div>

          {/* Rows */}
          {parts.map((part, index) => (
            <div
              key={part.id}
              className={`grid ${getGridClass()} gap-1 px-2 py-1.5 items-center group hover:bg-verdigris/5 transition-colors ${
                index !== parts.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate" title={part.name}>
                  {part.name}
                </div>
                <select
                  value={part.stockType || ''}
                  onChange={(e) => handleStockTypeChange(part.id, e.target.value)}
                  className={`mt-0.5 text-xs px-1 py-0.5 rounded border-0 cursor-pointer max-w-full ${getStockColor(part.stockType)}`}
                >
                  <option value="">-- Kies materiaal --</option>
                  {stockTypes.map(st => (
                    <option key={st.name} value={st.name}>
                      {st.name} ({st.totalQuantity}×)
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600 text-right tabular-nums">
                {part.length}
              </div>
              {mode === '2d' && (
                <div className="text-sm text-gray-600 text-right tabular-nums">
                  {part.width}
                </div>
              )}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center border border-gray-200 rounded">
                  <button
                    onClick={() => handleQuantityChange(part.id, -1)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-violet hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-5 h-5 flex items-center justify-center font-medium text-gray-700 border-x border-gray-200">
                    {part.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(part.id, 1)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-violet hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
              {mode === '2d' && grainDirection && (
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleGrain(part.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      part.grain
                        ? 'bg-verdigris text-white'
                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                    }`}
                  >
                    {part.grain && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => handleRemove(part.id)}
                  className="p-0.5 text-gray-400 hover:text-flaming-peach opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {parts.length === 0 && stock.length > 0 && !isAdding && (
        <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
          Geen onderdelen. Voeg te zagen stukken toe.
        </p>
      )}

      {/* Add new part form */}
      {isAdding && (
        <div className="mt-2 p-3 bg-verdigris/5 border border-verdigris/30 rounded space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Naam (bijv. Zijwand)"
              value={newPart.name}
              onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
              autoFocus
            />
            <select
              value={newPart.stockType || ''}
              onChange={(e) => setNewPart({ ...newPart, stockType: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
            >
              <option value="">-- Materiaal --</option>
              {stockTypes.map(st => (
                <option key={st.name} value={st.name}>
                  {st.name} ({st.totalQuantity}×)
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Lengte (mm)</label>
              <input
                type="number"
                value={newPart.length}
                onChange={(e) => setNewPart({ ...newPart, length: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
              />
            </div>
            {mode === '2d' && (
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Breedte (mm)</label>
                <input
                  type="number"
                  value={newPart.width}
                  onChange={(e) => setNewPart({ ...newPart, width: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                />
              </div>
            )}
            <div className="w-20">
              <label className="block text-xs text-gray-500 mb-1">Aantal</label>
              <input
                type="number"
                value={newPart.quantity}
                onChange={(e) => setNewPart({ ...newPart, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                min="1"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
              />
            </div>
          </div>
          {mode === '2d' && grainDirection && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={newPart.grain}
                onChange={(e) => setNewPart({ ...newPart, grain: e.target.checked })}
                className="w-4 h-4 text-verdigris rounded border-gray-300 focus:ring-verdigris"
              />
              Nerf-richting behouden
            </label>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-2 text-sm font-medium text-white bg-verdigris rounded hover:bg-verdigris-light transition-colors"
            >
              Toevoegen
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
