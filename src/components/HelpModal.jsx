/**
 * HelpModal Component
 * Documentatie en help voor Zaagplan Optimizer
 * OpenAEC Huisstijl kleuren
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
    { id: 'credits', label: 'Credits' },
  ]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header - OpenAEC kleuren */}
        <div className="bg-violet px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Zaagplan Optimizer</h2>
            <p className="text-verdigris text-sm font-medium">Versie 2.0 - OpenAEC</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-verdigris text-2xl transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-6 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id 
                    ? 'border-verdigris text-violet bg-white' 
                    : 'border-transparent text-gray-500 hover:text-violet hover:border-verdigris-light'}
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
              <h3 className="text-lg font-semibold text-violet">Basisgebruik</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">1. Modus kiezen</h4>
                <p className="text-gray-600">
                  <strong>1D (Latten/Balken):</strong> Voor lineaire materialen zoals KVH balken, stalen profielen, buizen.
                  <br />
                  <strong>2D (Platen):</strong> Voor plaatmateriaal zoals multiplex, MDF, staalplaat.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">2. Voorraad invoeren</h4>
                <p className="text-gray-600">
                  Voer de beschikbare voorraadmaten in met aantallen. Je kunt meerdere maten opgeven 
                  (bijv. 4000mm en 3000mm latten). Gebruik -1 voor onbeperkte voorraad.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">3. Onderdelen invoeren</h4>
                <p className="text-gray-600">
                  Voer de te zagen onderdelen in met lengte (en breedte voor 2D) en aantal.
                  Je kunt ook CSV importeren vanuit Excel of Revit.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">4. Optimaliseren</h4>
                <p className="text-gray-600">
                  Klik op <strong>Optimaliseren</strong>. Het gekozen algoritme berekent het optimale zaagplan
                  met minimaal materiaalverlies.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">5. Bewerken (optioneel)</h4>
                <p className="text-gray-600">
                  In <strong>Edit Mode</strong> kun je onderdelen handmatig verslepen tussen platen/latten.
                  Gebruik de parkeerplaats voor tijdelijke opslag. Wijzigingen kun je opslaan.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">6. Exporteren</h4>
                <p className="text-gray-600">
                  Exporteer het zaagplan naar PDF voor in de werkplaats, of naar CSV voor verdere verwerking.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'algoritmes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet">Beschikbare Algoritmes</h3>
              
              <div className="bg-violet bg-opacity-5 p-4 rounded-lg border-l-4 border-violet">
                <h4 className="font-medium text-violet">1D Algoritmes</h4>
                <div className="mt-2 space-y-3">
                  <div>
                    <strong className="text-gray-800">Hybrid (Aanbevolen)</strong>
                    <p className="text-gray-600 text-sm">
                      Onze eigen aanpak: grote stukken eerst op langste voorraad, 
                      kleine stukken optimaal in reststukken. Goede balans tussen snelheid en resultaat.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800">Smart Split</strong>
                    <p className="text-gray-600 text-sm">
                      Voor onderdelen langer dan voorraad. Splitst automatisch in delen met 
                      configureerbare overlap (joint allowance) voor verbindingen.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-800">OR-Tools Optimaal</strong>
                    <p className="text-gray-600 text-sm">
                      Exacte oplossing via Google's OR-Tools Column Generation algoritme.
                      Beste resultaat, maar kan langzamer zijn bij veel onderdelen.
                      <span className="text-flaming-peach font-medium"> Vereist backend server.</span>
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
              
              <div className="bg-verdigris bg-opacity-10 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet">2D Algoritmes</h4>
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
                </div>
              </div>

              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">Voorraad Constraints</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Alle algoritmes respecteren de opgegeven voorraad aantallen. Als een stock type 
                  op is, wordt automatisch naar de volgende geschikte maat gezocht.
                  Gebruik -1 voor onbeperkte voorraad.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'libraries' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet">Gebruikte Libraries</h3>
              
              <p className="text-gray-600">
                De Zaagplan Optimizer maakt gebruik van de volgende open-source libraries:
              </p>
              
              <div className="bg-violet bg-opacity-5 p-4 rounded-lg">
                <h4 className="font-medium text-violet mb-3">Frontend</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-violet divide-opacity-20">
                    <tr>
                      <td className="py-2 font-medium text-gray-800">React 18</td>
                      <td className="py-2 text-gray-600">UI framework</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Vite</td>
                      <td className="py-2 text-gray-600">Build tool & dev server</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Tailwind CSS</td>
                      <td className="py-2 text-gray-600">Styling framework</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">maxrects-packer</td>
                      <td className="py-2 text-gray-600">2D bin packing (rechthoeken)</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">jsPDF</td>
                      <td className="py-2 text-gray-600">PDF generatie</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-verdigris bg-opacity-10 p-4 rounded-lg">
                <h4 className="font-medium text-violet mb-3">Backend (Python)</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-verdigris divide-opacity-30">
                    <tr>
                      <td className="py-2 font-medium text-gray-800">FastAPI</td>
                      <td className="py-2 text-gray-600">REST API framework</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Google OR-Tools</td>
                      <td className="py-2 text-gray-600">Optimalisatie solver (Column Generation)</td>
                      <td className="py-2 text-verdigris font-medium">Apache 2.0</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Uvicorn</td>
                      <td className="py-2 text-gray-600">ASGI server</td>
                      <td className="py-2 text-verdigris font-medium">BSD</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-800">Pydantic</td>
                      <td className="py-2 text-gray-600">Data validatie</td>
                      <td className="py-2 text-verdigris font-medium">MIT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
                De optimalisatie-algoritmes zijn gebaseerd op wetenschappelijk onderzoek 
                naar het "Cutting Stock Problem" (Gilmore & Gomory, 1961).
              </div>
            </div>
          )}
          
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet">Tips voor Optimaal Resultaat</h3>
              
              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 Meerdere voorraadmaten</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Voeg verschillende voorraadmaten toe (bijv. 4000mm, 3000mm, 2400mm).
                  Het algoritme kiest automatisch de meest efficiënte combinatie.
                </p>
              </div>
              
              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 Kerf instelling</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Stel de juiste zaagsnede breedte in (meestal 3-4mm voor cirkelzaag).
                  Dit voorkomt dat stukken niet passen in de praktijk.
                </p>
              </div>
              
              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 Probeer meerdere algoritmes</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Verschillende algoritmes kunnen verschillende resultaten geven.
                  Probeer er meerdere en vergelijk het afvalpercentage.
                </p>
              </div>
              
              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 Edit mode voor finetuning</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Na optimalisatie kun je handmatig stukken verslepen.
                  Soms zie je als mens optimalisaties die het algoritme mist.
                </p>
              </div>
              
              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 CSV import voor grote projecten</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Exporteer je onderdelenlijst vanuit Excel/Revit naar CSV.
                  Kolommen: id/name, length, width (2D), quantity.
                </p>
              </div>

              <div className="bg-friendly-yellow bg-opacity-20 p-4 rounded-lg border-l-4 border-friendly-yellow">
                <h4 className="font-medium text-violet">💡 Kleuren per onderdeelgroep</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Gesplitste onderdelen krijgen automatisch dezelfde kleur.
                  Dit maakt het makkelijk om gerelateerde stukken te herkennen.
                </p>
              </div>
              
              <div className="bg-flaming-peach bg-opacity-10 p-4 rounded-lg border-l-4 border-flaming-peach">
                <h4 className="font-medium text-flaming-peach">⚠️ Te lange onderdelen</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Onderdelen die langer zijn dan de langste voorraad worden 
                  automatisch gemarkeerd. Gebruik "Smart Split" om deze automatisch te splitsen.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet">Credits & Licentie</h3>
              
              <div className="bg-gradient-to-br from-violet to-violet-light p-6 rounded-lg text-white">
                <h4 className="font-bold text-lg mb-3">Zaagplan Optimizer</h4>
                <p className="text-gray-200 mb-4">
                  Een open-source tool voor het optimaliseren van zaagplannen, 
                  ontwikkeld voor de bouw- en maakindustrie.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white bg-opacity-10 p-3 rounded-lg">
                    <span className="text-2xl">👨‍💻</span>
                    <div>
                      <strong className="text-friendly-yellow">Jochem Bosman</strong>
                      <p className="text-gray-200 text-sm">Concept, Architectuur & Product Owner</p>
                      <p className="text-verdigris text-xs font-medium">OpenAEC</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white bg-opacity-10 p-3 rounded-lg">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <strong className="text-friendly-yellow">Claude (Anthropic)</strong>
                      <p className="text-gray-200 text-sm">AI Development Partner</p>
                      <p className="text-verdigris text-xs font-medium">Code, Algoritmes & Documentatie</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">Open Source</h4>
                <p className="text-gray-600 text-sm">
                  Deze tool is open-source en vrij te gebruiken. 
                  De broncode is beschikbaar voor educatieve en commerciële doeleinden.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-verdigris">
                <h4 className="font-medium text-violet mb-2">Technologie Stack</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-violet text-white rounded text-xs">React</span>
                  <span className="px-2 py-1 bg-verdigris text-white rounded text-xs">Tailwind CSS</span>
                  <span className="px-2 py-1 bg-violet text-white rounded text-xs">Vite</span>
                  <span className="px-2 py-1 bg-verdigris text-white rounded text-xs">FastAPI</span>
                  <span className="px-2 py-1 bg-friendly-yellow text-violet rounded text-xs font-medium">OR-Tools</span>
                  <span className="px-2 py-1 bg-flaming-peach text-white rounded text-xs">Docker</span>
                </div>
              </div>

              <div className="bg-verdigris bg-opacity-10 p-4 rounded-lg border border-verdigris">
                <h4 className="font-medium text-violet mb-2">🌐 OpenAEC</h4>
                <p className="text-gray-600 text-sm">
                  OpenAEC ontwikkelt open-source tools voor de AEC-industrie 
                  (Architecture, Engineering & Construction).
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - OpenAEC kleuren */}
        <div className="bg-violet px-6 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-300">
            © 2025 <span className="text-verdigris font-medium">OpenAEC</span> - Open Source Tools voor AEC
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-verdigris text-white rounded hover:bg-verdigris-light transition-colors font-medium"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
