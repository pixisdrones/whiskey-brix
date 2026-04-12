import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const MOLD_TYPES = ['Large cube', 'Small cube', 'Sphere', 'Collins spear', 'Custom']
const SEPARATION_OPTIONS = ['no', 'slight', 'significant']

function meltCheck(fullMelt, min, max) {
  if (fullMelt == null || min == null) return null
  if (fullMelt < min) return <span className="ind-low" title="Too fast">↓ {fullMelt} min</span>
  if (fullMelt > max) return <span className="ind-high" title="Too slow">↑ {fullMelt} min</span>
  return <span className="ind-ok">✓ {fullMelt} min</span>
}

function FreezeForm({ batches, onSave, onCancel }) {
  const [form, setForm] = useState({
    batch_id: '', date: new Date().toISOString().slice(0, 10),
    mold_type: '', cube_size: '', freezer_temp: '', freezer_location: '',
    freeze_time: '', hardness: 3, slush_start: '', full_melt: '',
    separation: 'no', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedBatch = batches.find(b => b.id === form.batch_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      cube_size: form.cube_size === '' ? null : Number(form.cube_size),
      freezer_temp: form.freezer_temp === '' ? null : Number(form.freezer_temp),
      freeze_time: form.freeze_time === '' ? null : Number(form.freeze_time),
      hardness: Number(form.hardness),
      slush_start: form.slush_start === '' ? null : Number(form.slush_start),
      full_melt: form.full_melt === '' ? null : Number(form.full_melt),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>Log Freeze Test</h3>

      <div className="form-row three-col">
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
            <option value="">— select batch —</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batch_id || b.id.slice(0, 8)} – {b.sku}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Mold Type">
          <select value={form.mold_type} onChange={e => set('mold_type', e.target.value)}>
            <option value="">— select —</option>
            {MOLD_TYPES.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      {selectedBatch && selectedBatch.melt_min != null && (
        <div style={{ background: 'var(--blue-light)', border: '0.5px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>Target melt: </span>
          <span style={{ fontSize: 12, color: 'var(--blue)' }}>
            {selectedBatch.melt_min}–{selectedBatch.melt_max} min
          </span>
        </div>
      )}

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Cube Size (cm)">
          <input type="number" step="0.1" value={form.cube_size} onChange={e => set('cube_size', e.target.value)} placeholder="5.0" />
        </Field>
        <Field label="Freezer Temp (°F)">
          <input type="number" step="0.1" value={form.freezer_temp} onChange={e => set('freezer_temp', e.target.value)} placeholder="-4" />
        </Field>
        <Field label="Freezer Location">
          <input value={form.freezer_location} onChange={e => set('freezer_location', e.target.value)} placeholder="Back left shelf" />
        </Field>
        <Field label="Freeze Time (hrs)">
          <input type="number" step="0.5" value={form.freeze_time} onChange={e => set('freeze_time', e.target.value)} placeholder="24" />
        </Field>
      </div>

      <div className="form-row three-col">
        <Field label={`Hardness: ${form.hardness}/5`}>
          <div className="slider-row">
            <input
              type="range" min="1" max="5" step="1"
              value={form.hardness}
              onChange={e => set('hardness', e.target.value)}
            />
            <span className="slider-value">{form.hardness}</span>
          </div>
        </Field>
        <Field label={`Slush Start (min)${selectedBatch?.melt_min ? ` · target ≥${selectedBatch.melt_min}` : ''}`}>
          <input type="number" step="0.5" value={form.slush_start} onChange={e => set('slush_start', e.target.value)} placeholder="6" />
        </Field>
        <Field label={`Full Melt (min)${selectedBatch?.melt_min ? ` · target ${selectedBatch.melt_min}–${selectedBatch.melt_max}` : ''}`}>
          <input type="number" step="0.5" value={form.full_melt} onChange={e => set('full_melt', e.target.value)} placeholder="10" />
        </Field>
      </div>

      <div className="form-row two-col">
        <Field label="Separation">
          <select value={form.separation} onChange={e => set('separation', e.target.value)}>
            {SEPARATION_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations…" />
        </Field>
      </div>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">Log freeze test</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function FreezeCard({ test, onDelete }) {
  const hasMeltTarget = test.melt_min != null
  const meltOk = hasMeltTarget && test.full_melt != null
    ? test.full_melt >= test.melt_min && test.full_melt <= test.melt_max
    : null

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{test.sku}</span>
          <span className="text-sm text-muted">Batch: {test.batch_label || test.batch_id?.slice(0, 8)}</span>
          {test.mold_type && <span className="text-sm text-muted">{test.mold_type}</span>}
          {test.date && <span className="text-sm text-muted">{test.date}</span>}
          {test.separation && test.separation !== 'no' && (
            <span style={{ background: 'var(--red-light)', color: 'var(--red)', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              Separation: {test.separation}
            </span>
          )}
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(test.id)}>Delete</button>
      </div>
      <div className="card-body">
        <div className="targets">
          {test.freezer_location && (
            <div className="target-item">
              <span className="target-label">Location</span>
              <span className="target-value">{test.freezer_location}</span>
            </div>
          )}
          {test.freezer_temp != null && (
            <div className="target-item">
              <span className="target-label">Freezer Temp</span>
              <span className="target-value">{test.freezer_temp}°F</span>
            </div>
          )}
          {test.hardness != null && (
            <div className="target-item">
              <span className="target-label">Hardness</span>
              <span className="target-value">{test.hardness}/5</span>
            </div>
          )}
          {test.slush_start != null && (
            <div className="target-item">
              <span className="target-label">Slush Start</span>
              <span className="target-value">{test.slush_start} min</span>
            </div>
          )}
          <div className="target-item">
            <span className="target-label">Full Melt</span>
            <span className="target-value">
              {meltCheck(test.full_melt, test.melt_min, test.melt_max) ?? (test.full_melt ? `${test.full_melt} min` : <span className="text-muted">—</span>)}
              {hasMeltTarget && (
                <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (target {test.melt_min}–{test.melt_max})
                </span>
              )}
            </span>
          </div>
          {test.freeze_time != null && (
            <div className="target-item">
              <span className="target-label">Freeze Time</span>
              <span className="target-value">{test.freeze_time} hrs</span>
            </div>
          )}
        </div>
        {test.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{test.notes}</p>}
      </div>
    </div>
  )
}

export default function FreezeView() {
  const [tests, setTests] = useState([])
  const [batches, setBatches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getFreezeTests(), api.getBatches()])
    .then(([t, b]) => { setTests(t); setBatches(b) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    await api.createFreezeTest(payload)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this freeze test?')) return
    await api.deleteFreezeTest(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Freeze Tests"
        action={
          <button className={`form-toggle-btn${showForm ? ' open' : ''}`} onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Log Freeze Test'}
          </button>
        }
      />

      {showForm && (
        <FreezeForm batches={batches} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : tests.length === 0
          ? <div className="empty-state"><p>No freeze tests logged yet.</p></div>
          : (
            <div className="card-list">
              {tests.map(t => <FreezeCard key={t.id} test={t} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
