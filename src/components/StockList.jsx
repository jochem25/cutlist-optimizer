import { useState } from 'react'

/**
 * StockList Component
 * Beheer voorraad van platen (2D) of balken/latten (1D)
 * 
 * Gegroepeerd per materiaal type (naam), met verschillende maten per type
 */
export default function StockList({ mode, stock, setStock }) {
  const [isAdding, setIsAdding] = useState(false)
  const [expandedTypes, setExpandedTypes] = useState({})
  const [newItem, setNewItem] = useState({
    name: '',
    length: 2440,
    width: 1220,
    quantity: 1
  })

  // Groepeer stock per type naam
  const getGroupedStock = () => {
    const groups = {}
    for (const item of stock) {
      if (!groups[item.name]) {
        groups[item.name] = {
          name: item.name,
          items: [],
          totalQuantity: 0
        }
      }
      groups[item.name].items.push(item)
      groups[item.name].totalQuantity += item.quantity
    }
    return Object.values(groups)
  }

  const groupedStock = getGroupedStock()

  const handleAdd = () => {
    if (!newItem.name.trim()) return

    // Check of exact dezelfde maat al bestaat
    const existing = stock.find(s => 
      s.name === newItem.name && 
      s.length === newItem.length && 
      (mode === '1d' || s.width === newItem.width)
    )

    if (existing) {
      // Verhoog quantity van bestaande maat
      setStock(stock.map(item =>
        item.id === existing.id
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      ))
    } else {
      // Voeg nieuwe maat toe
      const item = {
        id: Date.now(),
        name: newItem.name,
        length: newItem.length,
        width: mode === '2d' ? newItem.width : null,
        quantity: newItem.quantity
      }
      setStock([...stock, item])
      
      // Auto-expand het type
      setExpandedTypes(prev => ({ ...prev, [newItem.name]: true }))
    }

    setNewItem({ name: '', length: 2440, width: 1220, quantity: 1 })
    setIsAdding(false)
  }

  const handleRemove = (id) => {
    setStock(stock.filter(item => item.id !== id))
  }

  const handleQuantityChange = (id, delta) => {
    setStock(stock.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ))
  }

  const toggleExpanded = (typeName) => {
    setExpandedTypes(prev => ({
      ...prev,
      [typeName]: !prev[typeName]
    }))
  }

  // Haal bestaande type namen op voor dropdown
  const existingTypeNames = [...new Set(stock.map(s => s.name))]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-violet flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Voorraad
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-verdigris hover:text-verdigris-light font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Toevoegen
        </button>
      </div>

      {/* Grouped stock items */}
      <div className="space-y-2">
        {groupedStock.length === 0 && !isAdding && (
          <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
            Geen voorraad. Voeg {mode === '2d' ? 'plaatmateriaal' : 'balkmateriaal'} toe.
          </p>
        )}

        {groupedStock.map(group => (
          <div key={group.name} className="border border-gray-200 rounded overflow-hidden">
            {/* Type header - clickable */}
            <button
              onClick={() => toggleExpanded(group.name)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedTypes[group.name] ? 'rotate-90' : ''}`} 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">{group.name}</span>
                <span className="text-xs text-gray-400">
                  ({group.items.length} {group.items.length === 1 ? 'maat' : 'maten'})
                </span>
              </div>
              <span className="text-sm font-semibold text-verdigris">
                {group.totalQuantity}×
              </span>
            </button>

            {/* Expanded items */}
            {expandedTypes[group.name] && (
              <div className="border-t border-gray-100 bg-gray-50">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-b-0 group"
                  >
                    <div className="flex items-center gap-3 pl-6">
                      <span className="text-sm text-gray-600">
                        {mode === '2d'
                          ? `${item.length} × ${item.width} mm`
                          : `${item.length} mm`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded bg-white">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="px-2 py-1 text-gray-500 hover:text-violet hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-sm font-medium text-gray-700 border-x border-gray-200 min-w-[2.5rem] text-center">
                          {item.quantity}×
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="px-2 py-1 text-gray-500 hover:text-violet hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 text-gray-400 hover:text-flaming-peach opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>
        ))}

        {/* Add new item form */}
        {isAdding && (
          <div className="p-3 bg-verdigris/5 border border-verdigris/30 rounded space-y-3">
            <div className="text-xs text-gray-500 mb-2">
              Voeg materiaal toe. Kleinste platen worden eerst gebruikt door het algoritme.
            </div>
            
            {/* Type naam - dropdown met bestaande of nieuw */}
            <div className="relative">
              <input
                type="text"
                list="stock-types"
                placeholder={mode === '2d' ? 'Type (bijv. Multiplex 18mm)' : 'Type (bijv. KVH 60×120)'}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                autoFocus
              />
              <datalist id="stock-types">
                {existingTypeNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Lengte (mm)</label>
                <input
                  type="number"
                  value={newItem.length}
                  onChange={(e) => setNewItem({ ...newItem, length: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                />
              </div>
              {mode === '2d' && (
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Breedte (mm)</label>
                  <input
                    type="number"
                    value={newItem.width}
                    onChange={(e) => setNewItem({ ...newItem, width: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                  />
                </div>
              )}
              <div className="w-20">
                <label className="block text-xs text-gray-500 mb-1">Aantal</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-verdigris focus:border-transparent"
                />
              </div>
            </div>
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
    </div>
  )
}
