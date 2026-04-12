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

function BatchForm({ recipes, onSave, onCancel }) {
  const [form, setForm] = useState({
    recipe_id: '', batch_id: '', date: new Date().toISOString().slice(0, 10),
    batch_size: '', batch_unit: 'L', start_time: '', end_time: '',
    observed_brix: '', observed_ph: '', color: '', notes: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedRecipe = recipes.find(r => r.id === form.recipe_id)

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
          <input type="number" step="0.1" value={form.observed_brix} onChange={e => set('observed_brix', e.target.value)} placeholder="21.0" />
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
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getBatches(), api.getRecipes()])
    .then(([b, r]) => { setBatches(b); setRecipes(r) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    await api.createBatch(payload)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch?')) return
    await api.deleteBatch(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Batches"
        action={
          <button className={`form-toggle-btn${showForm ? ' open' : ''}`} onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Log Batch'}
          </button>
        }
      />

      {showForm && (
        <BatchForm recipes={recipes} onSave={handleSave} onCancel={() => setShowForm(false)} />
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
