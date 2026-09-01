import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import RecipesView from './components/RecipesView.jsx'
import BatchesView from './components/BatchesView.jsx'
import FreezeView from './components/FreezeView.jsx'
import TastingsView from './components/TastingsView.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import MoldsView from './components/MoldsView.jsx'
import TestersView from './components/TestersView.jsx'
import BottlesView from './components/BottlesView.jsx'
import MixSessionView from './components/MixSessionView.jsx'
import PantryView from './components/PantryView.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'batches', label: 'Batches' },
  { id: 'bottles', label: 'Bottles' },
  { id: 'freeze', label: 'Freeze Log' },
  { id: 'tastings', label: 'Tastings' },
  { id: 'testers', label: 'Testers' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'molds', label: 'Molds' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'mixprep', label: 'Mixer Prep' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [batchInitRecipe, setBatchInitRecipe] = useState(null)

  const handleStartBatch = (recipeId) => {
    setBatchInitRecipe(recipeId)
    setTab('batches')
  }

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
        {tab === 'recipes' && <RecipesView onStartBatch={handleStartBatch} />}
        {tab === 'batches' && <BatchesView initRecipeId={batchInitRecipe} onClearInit={() => setBatchInitRecipe(null)} />}
        {tab === 'freeze' && <FreezeView />}
        {tab === 'bottles' && <BottlesView />}
        {tab === 'tastings' && <TastingsView />}
        {tab === 'testers' && <TestersView />}
        {tab === 'ingredients' && <IngredientsView />}
        {tab === 'molds' && <MoldsView />}
        {tab === 'pantry' && <PantryView />}
        {tab === 'mixprep' && <MixSessionView />}
      </main>
    </div>
  )
}
