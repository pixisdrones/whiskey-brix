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

// Sliding scale viz for a single observed value against a target range
function RangeViz({ label, min, max, value, unit = '' }) {
  if (min == null || max == null || value == null) return null
  const padding = Math.max((max - min) * 1.5, 0.5)
  const vizMin = Math.max(0, min - padding)
  const vizMax = max + padding
  const range = vizMax - vizMin
  const toPercent = (v) => Math.max(0, Math.min(100, ((v - vizMin) / range) * 100))
  const bandLeft = toPercent(min)
  const bandWidth = toPercent(max) - bandLeft
  const pct = toPercent(value)
  const inRange = value >= min && value <= max

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
        {label}: target {min}–{max}{unit} ·{' '}
        <span style={{ color: inRange ? 'var(--green)' : 'var(--amber)' }}>
          observed {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 24, background: 'var(--bg)', border: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${bandLeft}%`, width: `${bandWidth}%`,
          background: 'var(--accent-light)', borderLeft: '2px solid var(--accent)', borderRight: '2px solid var(--accent)',
          opacity: 0.7
        }} />
        <div title={`${value}${unit}`} style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${pct}%`,
          width: 10, height: 10, borderRadius: '50%',
          background: inRange ? 'var(--green)' : 'var(--amber)',
          border: '1.5px solid white',
          zIndex: 2,
        }} />
      </div>
    </div>
  )
}

// Volume unit conversion helpers
const TO_ML = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41 }
function convertVolume(amount, fromUnit, toUnit) {
  const fromFactor = TO_ML[fromUnit]
  const toFactor = TO_ML[toUnit]
  if (!fromFactor || !toFactor) return null // non-volume unit, can't convert
  return (amount * fromFactor) / toFactor
}
function formatAmt(val) {
  if (val == null) return '—'
  // Show up to 4 sig figs, trimming trailing zeros
  return parseFloat(val.toPrecision(4)).toString()
}

// Step 1: Batch Planner — scale ingredients
function BatchPlanner({ recipes, onProceed, onCancel }) {
  const [recipeId, setRecipeId] = useState('')
  const [planMode, setPlanMode] = useState('volume') // 'volume' | 'cubes'
  const [targetSize, setTargetSize] = useState('')
  const [targetUnit, setTargetUnit] = useState('L')
  const [cubeSize, setCubeSize] = useState('')
  const [numCubes, setNumCubes] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  const resetPlan = () => setPlan(null)

  const totalOz = planMode === 'cubes' && cubeSize && numCubes
    ? Math.round(Number(cubeSize) * Number(numCubes) * 100) / 100
    : null

  const handlePlan = async (e) => {
    e.preventDefault()
    if (!recipeId) return
    const reqSize = planMode === 'volume' ? Number(targetSize) : totalOz
    const reqUnit = planMode === 'volume' ? targetUnit : 'oz'
    if (!reqSize || reqSize <= 0) return
    setLoading(true)
    try {
      const result = await api.planBatch({ recipe_id: recipeId, target_size: reqSize, target_unit: reqUnit })
      setPlan(result)
    } finally {
      setLoading(false)
    }
  }

  const displayUnit = planMode === 'volume' ? targetUnit : 'oz'

  return (
    <div className="form-panel">
      <h3 style={{ marginBottom: 4 }}>Batch Planner</h3>
      <p className="text-muted text-sm" style={{ marginBottom: 12 }}>Scale recipe ingredients to your target output.</p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, width: 'fit-content' }}>
        {[['volume', 'By Volume'], ['cubes', 'By Cubes']].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => { setPlanMode(val); resetPlan() }}
            style={{
              padding: '5px 14px', fontSize: 13, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: planMode === val ? 'var(--accent)' : 'transparent',
              color: planMode === val ? '#fff' : 'var(--text-secondary)',
              fontWeight: planMode === val ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handlePlan}>
        <div className="form-row three-col">
          <Field label="Recipe *">
            <select required value={recipeId} onChange={e => { setRecipeId(e.target.value); resetPlan() }}>
              <option value="">— select recipe —</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>)}
            </select>
          </Field>

          {planMode === 'volume' ? (
            <>
              <Field label="Target Output">
                <input required type="number" step="0.1" min="0.1" value={targetSize} onChange={e => { setTargetSize(e.target.value); resetPlan() }} placeholder="5.0" />
              </Field>
              <Field label="Unit">
                <select value={targetUnit} onChange={e => setTargetUnit(e.target.value)}>
                  {['L', 'ml', 'gal', 'oz'].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Cube Size (fl oz)">
                <input required type="number" step="0.25" min="0.25" value={cubeSize} onChange={e => { setCubeSize(e.target.value); resetPlan() }} placeholder="2.0" />
              </Field>
              <Field label="Number of Cubes">
                <input required type="number" step="1" min="1" value={numCubes} onChange={e => { setNumCubes(e.target.value); resetPlan() }} placeholder="9" />
              </Field>
            </>
          )}
        </div>

        {planMode === 'cubes' && totalOz != null && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Total batch volume: <strong style={{ color: 'var(--accent)' }}>{totalOz} oz</strong>
            {' '}({Math.round(totalOz * 29.5735)} ml)
          </div>
        )}

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
            {planMode === 'cubes'
              ? `Scaled for ${numCubes} × ${cubeSize} oz cubes (${totalOz} oz total)`
              : `Scaled for ${targetSize} ${targetUnit}`}
            <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 8 }}>
              (scale factor: {Math.round(plan.scale_factor * 100) / 100}×)
            </span>
          </div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ingredient', `Original (${displayUnit})`, `Scaled (${displayUnit})`].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', paddingBottom: 6, paddingRight: 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.ingredients.map(ing => {
                const origUnit = ing.catalog_unit ?? ing.unit
                const origConverted = convertVolume(ing.amount, origUnit, displayUnit)
                const scaledConverted = convertVolume(ing.scaled_amount, origUnit, displayUnit)
                const origDisplay = origConverted != null ? `${formatAmt(origConverted)} ${displayUnit}` : `${ing.amount} ${origUnit}`
                const scaledDisplay = scaledConverted != null ? `${formatAmt(scaledConverted)} ${displayUnit}` : `${ing.scaled_amount} ${origUnit}`
                return (
                  <tr key={ing.id}>
                    <td style={{ paddingRight: 16, paddingBottom: 4 }}>{ing.catalog_name ?? ing.name}</td>
                    <td style={{ paddingRight: 16, paddingBottom: 4, color: 'var(--text-secondary)' }}>{origDisplay}</td>
                    <td style={{ paddingBottom: 4, fontWeight: 700 }}>{scaledDisplay}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => {
              const sz = planMode === 'volume' ? targetSize : totalOz
              const un = planMode === 'volume' ? targetUnit : 'oz'
              onProceed(recipeId, sz, un)
            }}
          >
            Proceed to Log Batch →
          </button>
        </div>
      )}
    </div>
  )
}

function BatchForm({ recipes, initial, initialRecipeId, initialSize, initialUnit, onSave, onCancel }) {
  const isEditing = !!initial
  const [form, setForm] = useState(() => initial ? {
    recipe_id: initial.recipe_id ?? '',
    batch_id: initial.batch_id ?? '',
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    batch_size: initial.batch_size ?? '',
    batch_unit: initial.batch_unit ?? 'L',
    start_time: initial.start_time ?? '',
    end_time: initial.end_time ?? '',
    observed_brix: initial.observed_brix ?? '',
    observed_ph: initial.observed_ph ?? '',
    color: initial.color ?? '',
    notes: initial.notes ?? '',
  } : {
    recipe_id: initialRecipeId ?? '',
    batch_id: '', date: new Date().toISOString().slice(0, 10),
    batch_size: initialSize ?? '', batch_unit: initialUnit ?? 'L',
    start_time: '', end_time: '',
    observed_brix: '', observed_ph: '', color: '', notes: ''
  })
  const [showBrixAdj, setShowBrixAdj] = useState(false)
  const [batchIdLocked, setBatchIdLocked] = useState(isEditing)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedRecipe = recipes.find(r => r.id === form.recipe_id)

  // Auto-generate batch ID when recipe or date changes (unless user manually edited it)
  useEffect(() => {
    if (!form.recipe_id || batchIdLocked) return
    api.getNextBatchId(form.recipe_id, form.date)
      .then(({ batch_id }) => setForm(f => ({ ...f, batch_id })))
      .catch(() => {})
  }, [form.recipe_id, form.date])

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
      <h3 style={{ marginBottom: 16 }}>{isEditing ? 'Edit Batch' : 'Log Batch'}</h3>

      <div className="form-row three-col">
        <Field label="Recipe *">
          <select required value={form.recipe_id} onChange={e => set('recipe_id', e.target.value)}>
            <option value="">— select recipe —</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>
            ))}
          </select>
        </Field>
        <Field label="Batch ID (auto)">
          <input
            value={form.batch_id}
            onChange={e => { set('batch_id', e.target.value); setBatchIdLocked(true) }}
            placeholder="Auto-generated on recipe select"
          />
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
        <Field label="Total Output">
          <input type="number" step="0.1" value={form.batch_size} onChange={e => set('batch_size', e.target.value)} placeholder="5.0" />
        </Field>
        <Field label="Units">
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
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Log batch'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function BatchCard({ batch, onEdit, onDelete }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{batch.batch_id || <span className="text-muted">No ID</span>}</span>
          <span className="text-sm text-muted">{batch.sku} – {batch.expression}</span>
          {batch.date && <span className="text-sm text-muted">{batch.date}</span>}
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(batch)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(batch.id)}>Delete</button>
        </div>
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
        {(batch.brix_min != null && batch.observed_brix != null) || (batch.ph_min != null && batch.observed_ph != null) ? (
          <div style={{ marginTop: 12 }}>
            <RangeViz label="Brix" min={batch.brix_min} max={batch.brix_max} value={batch.observed_brix} unit=" °Bx" />
            <RangeViz label="pH" min={batch.ph_min} max={batch.ph_max} value={batch.observed_ph} />
          </div>
        ) : null}
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
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getBatches(), api.getRecipes()])
    .then(([b, r]) => { setBatches(b); setRecipes(r) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateBatch(editing.id, payload)
      setEditing(null)
    } else {
      await api.createBatch(payload)
      setMode('none')
      setPlanResult(null)
    }
    load()
  }

  const handleEdit = (batch) => {
    setEditing(batch)
    setMode('none')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      {editing && (
        <BatchForm
          recipes={recipes}
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : batches.length === 0
          ? <div className="empty-state"><p>No batches logged yet.</p></div>
          : (
            <div className="card-list">
              {batches.map(b => <BatchCard key={b.id} batch={b} onEdit={handleEdit} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
