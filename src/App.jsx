import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import RecipesView from './components/RecipesView.jsx'
import BatchesView from './components/BatchesView.jsx'
import FreezeView from './components/FreezeView.jsx'
import TastingsView from './components/TastingsView.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'batches', label: 'Batches' },
  { id: 'freeze', label: 'Freeze Tests' },
  { id: 'tastings', label: 'Tastings' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          Whiskey Brix <span>R&D Database</span>
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'recipes' && <RecipesView />}
        {tab === 'batches' && <BatchesView />}
        {tab === 'freeze' && <FreezeView />}
        {tab === 'tastings' && <TastingsView />}
      </main>
    </div>
  )
}
