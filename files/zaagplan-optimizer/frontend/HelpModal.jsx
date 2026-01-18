/**
 * HelpModal Component
 * Documentatie en help voor Zaagplan Optimizer
 */
import { useState } from 'react'

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('gebruik')
  
  if (!isOpen) return null
  
  const tabs = [
    { id: 'gebruik', label: 'Gebruik' },
    { id: 'algoritmes', label: 'Algoritmes' },
    { id: 'libraries', label: 'Libraries' },
    { id: 'tips', label: 'Tips' },
  ]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-teal-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Zaagplan Optimizer</h2>
            <p className="text-purple-200 text-sm">Versie 2.0 - 3BM Bouwkunde</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-6 text-sm font-medium border-b-2 
                  ${activeTab === tab.id 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'gebruik' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basisgebruik</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">1. Modus kiezen</h4>
                <p className="text-gray-600">
                  <strong>1D (Latten/Balken):</strong> Voor lineaire materialen zoals KVH balken, stalen profielen, buizen.
                  <br />
                  <strong>2D (Platen):</strong> Voor plaatmateriaal zoals multiplex, MDF, staalplaat.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">2. Voorraad invoeren</h4>
                <p className="text-gray-600">
                  Voer de beschikbare voorraadmaten in. Je kunt meerdere maten opgeven (bijv. 4000mm en 3000mm latten).
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">3. Onderdelen invoeren</h4>
                <p className="text-gray-600">
                  Voer de te zagen onderdelen in met lengte (en breedte voor 2D) en aantal.
                  Je kunt ook CSV importeren.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">4. Optimaliseren</h4>
                <p className="text-gray-600">
                  Klik op <strong>Optimaliseren</strong>. Het gekozen algoritme berekent het optimale zaagplan.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">5. Bewerken (optioneel)</h4>
                <p className="text-gray-600">
                  In <strong>Edit Mode</strong> kun je onderdelen handmatig verslepen tussen platen/latten.
                  Gebruik de parkeerplaats voor tijdelijke opslag.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'algoritmes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Beschikbare Algoritmes</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-medium text-blue-800">1D Algoritmes</h4>
                <div className="mt-2 space-y-3">
                  <div>
                    <strong className="text-gray-800">Hybrid (Aanbevolen)</strong>
                    <p className="text-gray-600 text-sm">
                      Onze eigen aanpak: grote stukken eerst op langste voorraad, 
                      kleine stukken optimaal in reststukken. Goede balans tussen snelheid en resultaat.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800">OR-Tools Optimaal</strong>
                    <p className="text-gray-600 text-sm">
                      Exacte oplossing via Google's OR-Tools Column Generation algoritme.
                      Beste resultaat, maar kan langzamer zijn bij veel onderdelen.
                      <span className="text-orange-600"> Vereist backend server.</span>
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800">First Fit Decreasing (FFD)</strong>
                    <p className="text-gray-600 text-sm">
                      Klassieke greedy heuristiek. Plaatst grootste stukken eerst.
                      Zeer snel, maar ~15-20% minder optimaal.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-medium text-green-800">2D Algoritmes</h4>
                <div className="mt-2 space-y-3">
                  <div>
                    <strong className="text-gray-800">MaxRects Packer</strong>
                    <p className="text-gray-600 text-sm">
                      Rechthoek bin-packing algoritme. Snel en geschikt voor standaard rechthoekige onderdelen.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800">MaxRects Multi-Start</strong>
                    <p className="text-gray-600 text-sm">
                      Voert meerdere optimalisaties uit met verschillende volgorde van onderdelen.
                      Bewaart beste resultaat. Langzamer maar beter resultaat.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800 opacity-50">NFP Nesting (Planned)</strong>
                    <p className="text-gray-600 text-sm opacity-50">
                      No-Fit Polygon algoritme voor complexe/irreguliere vormen.
                      In ontwikkeling voor toekomstige versie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'libraries' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Gebruikte Libraries</h3>
              
              <p className="text-gray-600">
                De Zaagplan Optimizer maakt gebruik van de volgende open-source libraries:
              </p>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-3">Frontend</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-purple-200">
                    <tr>
                      <td className="py-2 font-medium text-gray-800">React</td>
                      <td className="py-2 text-gray-600">UI framework</td>
                      <td className="py-2 text-purple-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Vite</td>
                      <td className="py-2 text-gray-600">Build tool & dev server</td>
                      <td className="py-2 text-purple-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Tailwind CSS</td>
                      <td className="py-2 text-gray-600">Styling framework</td>
                      <td className="py-2 text-purple-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">maxrects-packer</td>
                      <td className="py-2 text-gray-600">2D bin packing (rechthoeken)</td>
                      <td className="py-2 text-purple-600">MIT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-teal-50 p-4 rounded-lg">
                <h4 className="font-medium text-teal-800 mb-3">Backend (Python)</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-teal-200">
                    <tr>
                      <td className="py-2 font-medium text-gray-800">FastAPI</td>
                      <td className="py-2 text-gray-600">REST API framework</td>
                      <td className="py-2 text-teal-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Google OR-Tools</td>
                      <td className="py-2 text-gray-600">Optimalisatie solver (1D cutting stock)</td>
                      <td className="py-2 text-teal-600">Apache 2.0</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Uvicorn</td>
                      <td className="py-2 text-gray-600">ASGI server</td>
                      <td className="py-2 text-teal-600">BSD</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Pydantic</td>
                      <td className="py-2 text-gray-600">Data validatie</td>
                      <td className="py-2 text-teal-600">MIT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-3">Geplande Libraries (2D Irregular)</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-orange-200">
                    <tr>
                      <td className="py-2 font-medium text-gray-800">WasteOptimiser</td>
                      <td className="py-2 text-gray-600">NFP-based nesting voor irreguliere vormen</td>
                      <td className="py-2 text-orange-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">libnfporb</td>
                      <td className="py-2 text-gray-600">No-Fit Polygon berekening (C++)</td>
                      <td className="py-2 text-orange-600">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Shapely</td>
                      <td className="py-2 text-gray-600">Geometrische operaties</td>
                      <td className="py-2 text-orange-600">BSD</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
                <strong>Broncode:</strong> Deze tool is ontwikkeld door 3BM Bouwkunde.
                <br />
                De optimalisatie-algoritmes zijn gebaseerd op wetenschappelijk onderzoek 
                naar het "Cutting Stock Problem" (Gilmore & Gomory, 1961).
              </div>
            </div>
          )}
          
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tips voor Optimaal Resultaat</h3>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-800">💡 Meerdere voorraadmaten</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Voeg verschillende voorraadmaten toe (bijv. 4000mm, 3000mm, 2400mm).
                  Het algoritme kiest automatisch de meest efficiënte combinatie.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-800">💡 Kerf instelling</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Stel de juiste zaagsnede breedte in (meestal 3-4mm voor cirkelzaag).
                  Dit voorkomt dat stukken niet passen in de praktijk.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-800">💡 Probeer meerdere algoritmes</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Verschillende algoritmes kunnen verschillende resultaten geven.
                  Probeer er meerdere en vergelijk het afvalpercentage.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-800">💡 Edit mode voor finetuning</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Na optimalisatie kun je handmatig stukken verslepen.
                  Soms zie je als mens optimalisaties die het algoritme mist.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-medium text-yellow-800">💡 CSV import voor grote projecten</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Exporteer je onderdelenlijst vanuit Excel/Revit naar CSV.
                  Importeer in één keer alle onderdelen.
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                <h4 className="font-medium text-red-800">⚠️ Te lange onderdelen</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Onderdelen die langer zijn dan de langste voorraad worden 
                  automatisch gemarkeerd en niet geplaatst. Controleer je input!
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t">
          <span className="text-sm text-gray-500">
            © 2025 3BM Bouwkunde - Ingenieurs van oplossingen
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
