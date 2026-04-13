import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

function brixIndicator(observed, min, max) {
  if (observed == null || min == null) return null
  if (observed < min) return <span className="ind-low" title="Below target">↓ {observed}</span>
  if (observed > max) return <span className="ind-high" title="Above target">↑ {observed}</span>
  return <span className="ind-ok" title="On target">✓ {observed}</span>
}

function phIndicator(observed, min, max) {
  if (observed == null || min == null) return null
  if (observed < min) return <span className="ind-low" title="Below target">↓ {observed}</span>
  if (observed > max) return <span className="ind-high" title="Above target">↑ {observed}</span>
  return <span className="ind-ok" title="On target">✓ {observed}</span>
}

// Brix adjustment dialogue
function BrixAdjustDialog({ observed, target_min, target_max, batch_size, batch_unit, onClose }) {
  if (!observed || !target_min) return null
  const target_mid = (target_min + target_max) / 2
  const diff = observed - target_mid
  const isHigh = diff > 0

  // Simple formula: C1*V1 = C2*V2
  // To dilute (high brix): add water
  // To concentrate (low brix): add more sugar
  let suggestion = null
  if (batch_size) {
    if (isHigh) {
      // dilute: V2 = (C1*V1)/C2 → extra water = V2 - V1
      const v2 = (observed * batch_size) / target_mid
      const water = Math.round((v2 - batch_size) * 100) / 100
      suggestion = `Add ~${water} ${batch_unit} of water to dilute from ${observed} °Bx to ~${target_mid} °Bx.`
    } else {
      // Add sugar: Using approx 1% brix ≈ add 10g sugar per liter
      const brixNeeded = target_mid - observed
      // rough: each g of sugar added to V liters raises brix by ~(100/(100+amount))
      // simpler: tell user how many grams of sugar to add per liter
      const gramsPerUnit = batch_unit === 'L' ? 10 : batch_unit === 'ml' ? 0.01 : 28.3
      const grams = Math.round(brixNeeded * gramsPerUnit * batch_size * 10) / 10
      suggestion = `Add ~${grams}g of sugar (${Math.round(brixNeeded * 10) / 10} °Bx needed) to reach ~${target_mid} °Bx.`
    }
  } else {
    if (isHigh) {
      suggestion = `Brix is ${Math.abs(Math.round(diff * 10) / 10)} °Bx above target midpoint (${target_mid}). Dilute with water.`
    } else {
      suggestion = `Brix is ${Math.abs(Math.round(diff * 10) / 10)} °Bx below target midpoint (${target_mid}). Add simple syrup or sugar.`
    }
  }

  return (
    <div style={{ background: isHigh ? 'var(--amber-light)' : 'var(--blue-light)', border: `0.5px solid ${isHigh ? '#fcd34d' : '#bfdbfe'}`, borderRadius: 'var(--radius)', padding: 16, margin: '12px 0' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: isHigh ? 'var(--amber)' : 'var(--blue)', marginBottom: 6 }}>
        Brix Adjustment: {observed} °Bx → target {target_min}–{target_max} °Bx
      </div>
      <p style={{ fontSize: 13, color: isHigh ? '#92400e' : '#1e3a5f' }}>{suggestion}</p>
      <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={onClose}>Dismiss</button>
    </div>
  )
}

// Step 1: Batch Planner — scale ingredients
function BatchPlanner({ recipes, onProceed, onCancel }) {
  const [recipeId, setRecipeId] = useState('')
  const [targetSize, setTargetSize] = useState('')
  const [targetUnit, setTargetUnit] = useState('L')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedRecipe = recipes.find(r => r.id === recipeId)

  const handlePlan = async (e) => {
    e.preventDefault()
    if (!recipeId || !targetSize) return
    setLoading(true)
    try {
      const result = await api.planBatch({ recipe_id: recipeId, target_size: Number(targetSize), target_unit: targetUnit })
      setPlan(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-panel">
      <h3 style={{ marginBottom: 4 }}>Batch Planner</h3>
      <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Scale recipe ingredients to your target output volume.</p>

      <form onSubmit={handlePlan}>
        <div className="form-row three-col">
          <Field label="Recipe *">
            <select required value={recipeId} onChange={e => { setRecipeId(e.target.value); setPlan(null) }}>
              <option value="">— select recipe —</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>)}
            </select>
          </Field>
          <Field label="Target Output">
            <input required type="number" step="0.1" min="0.1" value={targetSize} onChange={e => { setTargetSize(e.target.value); setPlan(null) }} placeholder="5.0" />
          </Field>
          <Field label="Unit">
            <select value={targetUnit} onChange={e => setTargetUnit(e.target.value)}>
              {['L', 'ml', 'gal', 'oz'].map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-8">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>

      {plan && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
            Scaled for {targetSize} {targetUnit}
            <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 8 }}>
              (scale factor: {Math.round(plan.scale_factor * 100) / 100}×)
            </span>
          </div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ingredient', 'Original', 'Scaled'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', paddingBottom: 6, paddingRight: 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.ingredients.map(ing => (
                <tr key={ing.id}>
                  <td style={{ paddingRight: 16, paddingBottom: 4 }}>{ing.catalog_name ?? ing.name}</td>
                  <td style={{ paddingRight: 16, paddingBottom: 4, color: 'var(--text-secondary)' }}>{ing.amount} {ing.unit}</td>
                  <td style={{ paddingBottom: 4, fontWeight: 700 }}>{ing.scaled_amount} {ing.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => onProceed(recipeId, targetSize, targetUnit)}
          >
            Proceed to Log Batch →
          </button>
        </div>
      )}
    </div>
  )
}

function BatchForm({ recipes, initialRecipeId, initialSize, initialUnit, onSave, onCancel }) {
  const [form, setForm] = useState({
    recipe_id: initialRecipeId ?? '',
    batch_id: '', date: new Date().toISOString().slice(0, 10),
    batch_size: initialSize ?? '', batch_unit: initialUnit ?? 'L',
    start_time: '', end_time: '',
    observed_brix: '', observed_ph: '', color: '', notes: ''
  })
  const [showBrixAdj, setShowBrixAdj] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedRecipe = recipes.find(r => r.id === form.recipe_id)

  const brixOutOfRange = selectedRecipe && form.observed_brix !== '' &&
    (Number(form.observed_brix) < selectedRecipe.brix_min || Number(form.observed_brix) > selectedRecipe.brix_max)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      batch_size: form.batch_size === '' ? null : Number(form.batch_size),
      observed_brix: form.observed_brix === '' ? null : Number(form.observed_brix),
      observed_ph: form.observed_ph === '' ? null : Number(form.observed_ph),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>Log Batch</h3>

      <div className="form-row three-col">
        <Field label="Recipe *">
          <select required value={form.recipe_id} onChange={e => set('recipe_id', e.target.value)}>
            <option value="">— select recipe —</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>
            ))}
          </select>
        </Field>
        <Field label="Batch ID">
          <input value={form.batch_id} onChange={e => set('batch_id', e.target.value)} placeholder="B-2024-001" />
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
      </div>

      {selectedRecipe && (
        <div style={{ background: 'var(--accent-light)', border: '0.5px solid #c6d9b0', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Targets: </span>
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>
            Brix {selectedRecipe.brix_min}–{selectedRecipe.brix_max} °Bx &nbsp;|&nbsp; pH {selectedRecipe.ph_min}–{selectedRecipe.ph_max}
          </span>
        </div>
      )}

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label={`Observed Brix${selectedRecipe?.brix_min != null ? ` (${selectedRecipe.brix_min}–${selectedRecipe.brix_max})` : ''}`}>
          <input type="number" step="0.1" value={form.observed_brix} onChange={e => { set('observed_brix', e.target.value); setShowBrixAdj(false) }} placeholder="21.0" />
        </Field>
        <Field label={`Observed pH${selectedRecipe?.ph_min != null ? ` (${selectedRecipe.ph_min}–${selectedRecipe.ph_max})` : ''}`}>
          <input type="number" step="0.01" value={form.observed_ph} onChange={e => set('observed_ph', e.target.value)} placeholder="2.7" />
        </Field>
        <Field label="Batch Size">
          <input type="number" step="0.1" value={form.batch_size} onChange={e => set('batch_size', e.target.value)} placeholder="5.0" />
        </Field>
        <Field label="Unit">
          <select value={form.batch_unit} onChange={e => set('batch_unit', e.target.value)}>
            {['L', 'ml', 'gal', 'oz', 'unit'].map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      {brixOutOfRange && !showBrixAdj && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-sm" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '0.5px solid var(--amber)' }}
            onClick={() => setShowBrixAdj(true)}>
            Brix out of range — view adjustment guide
          </button>
        </div>
      )}
      {showBrixAdj && selectedRecipe && (
        <BrixAdjustDialog
          observed={Number(form.observed_brix)}
          target_min={selectedRecipe.brix_min}
          target_max={selectedRecipe.brix_max}
          batch_size={form.batch_size ? Number(form.batch_size) : null}
          batch_unit={form.batch_unit}
          onClose={() => setShowBrixAdj(false)}
        />
      )}

      <div className="form-row three-col">
        <Field label="Start Time">
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
        </Field>
        <Field label="End Time">
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </Field>
        <Field label="Color">
          <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Pale amber" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Process notes…" />
      </Field>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">Log batch</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function BatchCard({ batch, onDelete }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{batch.batch_id || <span className="text-muted">No ID</span>}</span>
          <span className="text-sm text-muted">{batch.sku} – {batch.expression}</span>
          {batch.date && <span className="text-sm text-muted">{batch.date}</span>}
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(batch.id)}>Delete</button>
      </div>
      <div className="card-body">
        <div className="targets">
          <div className="target-item">
            <span className="target-label">Brix</span>
            <span className="target-value" style={{ fontWeight: 600 }}>
              {brixIndicator(batch.observed_brix, batch.brix_min, batch.brix_max) ?? <span className="text-muted">—</span>}
              {batch.brix_min != null && (
                <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (target {batch.brix_min}–{batch.brix_max})
                </span>
              )}
            </span>
          </div>
          <div className="target-item">
            <span className="target-label">pH</span>
            <span className="target-value">
              {phIndicator(batch.observed_ph, batch.ph_min, batch.ph_max) ?? <span className="text-muted">—</span>}
              {batch.ph_min != null && (
                <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (target {batch.ph_min}–{batch.ph_max})
                </span>
              )}
            </span>
          </div>
          {batch.batch_size && (
            <div className="target-item">
              <span className="target-label">Size</span>
              <span className="target-value">{batch.batch_size} {batch.batch_unit}</span>
            </div>
          )}
          {batch.color && (
            <div className="target-item">
              <span className="target-label">Color</span>
              <span className="target-value">{batch.color}</span>
            </div>
          )}
          {(batch.start_time || batch.end_time) && (
            <div className="target-item">
              <span className="target-label">Time</span>
              <span className="target-value">{batch.start_time || '?'} – {batch.end_time || '?'}</span>
            </div>
          )}
        </div>
        {batch.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{batch.notes}</p>}
      </div>
    </div>
  )
}

export default function BatchesView() {
  const [batches, setBatches] = useState([])
  const [recipes, setRecipes] = useState([])
  const [mode, setMode] = useState('none') // 'none' | 'plan' | 'log'
  const [planResult, setPlanResult] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getBatches(), api.getRecipes()])
    .then(([b, r]) => { setBatches(b); setRecipes(r) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    await api.createBatch(payload)
    setMode('none')
    setPlanResult(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch?')) return
    await api.deleteBatch(id)
    load()
  }

  const handlePlanProceed = (recipeId, size, unit) => {
    setPlanResult({ recipeId, size, unit })
    setMode('log')
  }

  const handleCancel = () => { setMode('none'); setPlanResult(null) }

  return (
    <div>
      <SectionHeader
        title="Batches"
        action={
          <div className="flex gap-8">
            <button
              className={`form-toggle-btn${mode === 'plan' ? ' open' : ''}`}
              onClick={() => setMode(m => m === 'plan' ? 'none' : 'plan')}
            >
              {mode === 'plan' ? '✕ Cancel' : 'Batch Planner'}
            </button>
            <button
              className={`form-toggle-btn${mode === 'log' ? ' open' : ''}`}
              onClick={() => setMode(m => m === 'log' ? 'none' : 'log')}
            >
              {mode === 'log' ? '✕ Cancel' : '+ Log Batch'}
            </button>
          </div>
        }
      />

      {mode === 'plan' && (
        <BatchPlanner
          recipes={recipes}
          onProceed={handlePlanProceed}
          onCancel={handleCancel}
        />
      )}

      {mode === 'log' && (
        <BatchForm
          recipes={recipes}
          initialRecipeId={planResult?.recipeId}
          initialSize={planResult?.size}
          initialUnit={planResult?.unit}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : batches.length === 0
          ? <div className="empty-state"><p>No batches logged yet.</p></div>
          : (
            <div className="card-list">
              {batches.map(b => <BatchCard key={b.id} batch={b} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
