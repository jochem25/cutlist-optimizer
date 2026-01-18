/**
 * PartsTable Component
 * Toont stuklijst tabel gegroepeerd per plaat/balk
 */
export default function PartsTable({ mode, results, selectedSheet }) {
  if (!results || results.sheets.length === 0) {
    return null
  }

  const sheet = results.sheets[selectedSheet] || results.sheets[0]

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-violet mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Stuklijst - {sheet.name}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-semibold text-gray-600 w-12">Nr.</th>
                <th className="px-3 py-2 font-semibold text-gray-600">Onderdeel</th>
                <th className="px-3 py-2 font-semibold text-gray-600 text-right">Lengte (mm)</th>
                {mode === '2d' && (
                  <th className="px-3 py-2 font-semibold text-gray-600 text-right">Breedte (mm)</th>
                )}
                {mode === '2d' && (
                  <th className="px-3 py-2 font-semibold text-gray-600 text-center">Nerf</th>
                )}
                <th className="px-3 py-2 font-semibold text-gray-600 text-right">Positie</th>
              </tr>
            </thead>
            <tbody>
              {sheet.parts.map((part, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 hover:bg-verdigris/5 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-white bg-violet rounded-full">
                      {part.number}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {part.name}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-right font-mono">
                    {part.length}
                  </td>
                  {mode === '2d' && (
                    <td className="px-3 py-2 text-gray-600 text-right font-mono">
                      {part.width}
                    </td>
                  )}
                  {mode === '2d' && (
                    <td className="px-3 py-2 text-center">
                      {part.grain ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-verdigris/10 text-verdigris rounded">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-gray-500 text-right text-xs font-mono">
                    {mode === '2d'
                      ? `(${part.x}, ${part.y})`
                      : `${part.x} mm`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totalen */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-500">Totaal stukken:</span>
              <span className="ml-2 font-semibold text-violet">{sheet.parts.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Benutting:</span>
              <span className={`ml-2 font-semibold ${
                sheet.efficiency >= 80
                  ? 'text-verdigris'
                  : sheet.efficiency >= 60
                    ? 'text-yellow-600'
                    : 'text-flaming-peach'
              }`}>
                {sheet.efficiency.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-gray-500 text-xs">
            Restmateriaal: {(100 - sheet.efficiency).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}
