/**
 * Header Component
 * Bevat logo, titel en actie knoppen
 */
export default function Header({ onSave, onOpen, onExport, onHelp }) {
  return (
    <header className="bg-violet text-white px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-10 h-10 bg-verdigris rounded flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CutList Optimizer</h1>
          <p className="text-verdigris text-xs font-medium">OpenAEC</p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Open */}
        <button
          onClick={onOpen}
          className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors flex items-center gap-2"
          title="Open configuratie (CSV)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Open
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors flex items-center gap-2"
          title="Sla configuratie op (CSV)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Opslaan
        </button>

        {/* Export PDF */}
        <button
          onClick={onExport}
          className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors flex items-center gap-2"
          title="Exporteer zaagplan als PDF"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          PDF
        </button>

        {/* Help */}
        <button
          onClick={onHelp}
          className="px-3 py-2 text-sm bg-verdigris border border-verdigris rounded hover:bg-verdigris-light transition-colors flex items-center gap-2"
          title="Help & documentatie"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Help
        </button>
      </div>
    </header>
  )
}
