import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const FREEZER_LOCATIONS = [
  'Top Shelf L', 'Top Shelf M', 'Top Shelf R',
  'Bottom Shelf L', 'Bottom Shelf M', 'Bottom Shelf R',
]

function FreezeForm({ batches, molds, initial, onSave, onCancel }) {
  const isEditing = !!initial
  const [form, setForm] = useState(() => initial ? {
    batch_id: initial.batch_id ?? '',
    mold_id: initial.mold_id ?? '',
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    mold_type: initial.mold_type ?? '',
    volume_fl_oz: initial.volume_fl_oz ?? '',
    freezer_temp: initial.freezer_temp ?? '',
    freezer_out_temp: initial.freezer_out_temp ?? '',
    freezer_location: initial.freezer_location ?? '',
    freezer_in_time: initial.freezer_in_time ? initial.freezer_in_time.slice(0, 16) : '',
    freezer_out_time: initial.freezer_out_time ? initial.freezer_out_time.slice(0, 16) : '',
    qty_cubes: initial.qty_cubes ?? '',
    hardness: initial.hardness ?? 3,
    notes: initial.notes ?? '',
  } : {
    batch_id: '', mold_id: '', date: new Date().toISOString().slice(0, 10),
    mold_type: '', volume_fl_oz: '', freezer_temp: '', freezer_out_temp: '',
    freezer_location: '', freezer_in_time: '', freezer_out_time: '',
    qty_cubes: '', hardness: 3, notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectedBatch = batches.find(b => b.id === form.batch_id)
  const selectedMold = molds.find(m => m.id === form.mold_id)

  // Auto-fill volume from mold
  const moldVolume = selectedMold ? selectedMold.volume_fl_oz : null

  // Auto-compute freeze time display
  let freezeTimeDisplay = null
  if (form.freezer_in_time && form.freezer_out_time) {
    const inMs = new Date(form.freezer_in_time).getTime()
    const outMs = new Date(form.freezer_out_time).getTime()
    if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
      const mins = Math.round((outMs - inMs) / 60000)
      const hrs = Math.floor(mins / 60)
      const rem = mins % 60
      freezeTimeDisplay = hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      volume_fl_oz: form.volume_fl_oz !== '' ? Number(form.volume_fl_oz) : (moldVolume ?? null),
      freezer_temp: form.freezer_temp === '' ? null : Number(form.freezer_temp),
      freezer_out_temp: form.freezer_out_temp === '' ? null : Number(form.freezer_out_temp),
      qty_cubes: form.qty_cubes === '' ? null : Number(form.qty_cubes),
      hardness: Number(form.hardness),
      mold_id: form.mold_id || null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{isEditing ? 'Edit Freeze Test' : 'Log Freeze Test'}</h3>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
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
        <Field label="Mold">
          <select value={form.mold_id} onChange={e => set('mold_id', e.target.value)}>
            <option value="">— select mold (optional) —</option>
            {molds.map(m => {
              const shapeCode = { 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }[m.shape] ?? 'OT'
              const moldId = `${shapeCode}${String(Math.round(m.volume_fl_oz)).padStart(2,'0')}${String(m.sections).padStart(2,'0')}${String(m.mold_number).padStart(2,'0')}`
              return <option key={m.id} value={m.id}>{moldId} — {m.shape} {m.volume_fl_oz} fl. oz, {m.sections} sections</option>
            })}
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

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
        <Field label="fl. ozs.">
          <input type="number" step="0.25" value={form.volume_fl_oz || moldVolume || ''} onChange={e => set('volume_fl_oz', e.target.value)} placeholder={moldVolume ? `${moldVolume} (from mold)` : '2.0'} />
        </Field>
        <Field label="QTY Cubes">
          <input type="number" min="1" value={form.qty_cubes} onChange={e => set('qty_cubes', e.target.value)} placeholder={selectedMold?.sections ?? ''} />
        </Field>
        <Field label="Freezer In Temp (°F)">
          <input type="number" step="0.1" value={form.freezer_temp} onChange={e => set('freezer_temp', e.target.value)} placeholder="-4" />
        </Field>
        <Field label="Freezer Out Temp (°F)">
          <input type="number" step="0.1" value={form.freezer_out_temp} onChange={e => set('freezer_out_temp', e.target.value)} placeholder="-4" />
        </Field>
        <Field label="Freezer Location">
          <select value={form.freezer_location} onChange={e => set('freezer_location', e.target.value)}>
            <option value="">— select —</option>
            {FREEZER_LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className="form-row three-col">
        <Field label="Freezer In Time">
          <input type="datetime-local" value={form.freezer_in_time} onChange={e => set('freezer_in_time', e.target.value)} />
        </Field>
        <Field label="Freezer Out Time">
          <input type="datetime-local" value={form.freezer_out_time} onChange={e => set('freezer_out_time', e.target.value)} />
        </Field>
        <Field label="Freeze Time (auto)">
          <div style={{ padding: '8px 0', fontSize: 14, fontWeight: 600, color: freezeTimeDisplay ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {freezeTimeDisplay ?? '—'}
          </div>
        </Field>
      </div>

      <div className="form-row two-col">
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
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations…" />
        </Field>
      </div>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Log freeze test'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function FreezeCard({ test, onEdit, onDelete }) {
  const [cubes, setCubes] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    api.getFreezeCubes(test.id).then(setCubes)
  }, [test.id])

  const handleRemoveCube = async (cube) => {
    if (!confirm(`Remove Section #${cube.section_number} from inventory? This cannot be undone.`)) return
    setRemovingId(cube.id)
    await api.removeCube(cube.id)
    setCubes(prev => prev.map(c => c.id === cube.id ? { ...c, status: 'removed' } : c))
    setRemovingId(null)
  }

  let moldLabel = null
  if (test.mold_shape) {
    const code = { 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }[test.mold_shape] ?? 'OT'
    moldLabel = `${code} — ${test.mold_shape} ${test.mold_volume} fl. oz`
  }

  const frozen  = cubes ? cubes.filter(c => c.status === 'frozen').length  : null
  const removed = cubes ? cubes.filter(c => c.status === 'removed').length : null
  const tasted  = cubes ? cubes.filter(c => c.status === 'tasted').length  : null

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{test.sku}{test.expression ? ` – ${test.expression}` : ''}</span>
          <span className="text-sm text-muted">Batch: {test.batch_label || test.batch_id?.slice(0, 8)}</span>
          {moldLabel && <span className="text-sm text-muted">{moldLabel}</span>}
          {test.date && <span className="text-sm text-muted">{test.date}</span>}
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(test)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(test.id)}>Delete</button>
        </div>
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
              <span className="target-label">Freezer In Temp</span>
              <span className="target-value">{test.freezer_temp}°F</span>
            </div>
          )}
          {test.freezer_out_temp != null && (
            <div className="target-item">
              <span className="target-label">Freezer Out Temp</span>
              <span className="target-value">{test.freezer_out_temp}°F</span>
            </div>
          )}
          {test.volume_fl_oz != null && (
            <div className="target-item">
              <span className="target-label">fl. ozs.</span>
              <span className="target-value">{test.volume_fl_oz}</span>
            </div>
          )}
          {test.hardness != null && (
            <div className="target-item">
              <span className="target-label">Hardness</span>
              <span className="target-value">{test.hardness}/5</span>
            </div>
          )}
          {test.freeze_time != null && (
            <div className="target-item">
              <span className="target-label">Freeze Time</span>
              <span className="target-value">
                {test.freeze_time >= 60
                  ? `${Math.floor(test.freeze_time / 60)}h ${test.freeze_time % 60}m`
                  : `${test.freeze_time}m`}
              </span>
            </div>
          )}
          {(test.freezer_in_time || test.freezer_out_time) && (
            <div className="target-item">
              <span className="target-label">In → Out</span>
              <span className="target-value text-sm">
                {test.freezer_in_time ? new Date(test.freezer_in_time).toLocaleString() : '?'}
                {' → '}
                {test.freezer_out_time ? new Date(test.freezer_out_time).toLocaleString() : '?'}
              </span>
            </div>
          )}
        </div>
        {test.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{test.notes}</p>}

        {/* Cube inventory */}
        {cubes !== null && cubes.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: 'var(--border-subtle)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              Cube Inventory
              <span style={{ fontWeight: 400 }}>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{frozen}</span> available &nbsp;·&nbsp;
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{tasted}</span> tasted
                {removed > 0 && <> &nbsp;·&nbsp; <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{removed}</span> removed</>}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {cubes.map(c => {
                const isFrozen  = c.status === 'frozen'
                const isTasted  = c.status === 'tasted'
                const isRemoved = c.status === 'removed'
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 100, fontSize: 11,
                    background: isFrozen ? 'var(--blue-light)' : isTasted ? '#d1fae5' : '#f3f4f6',
                    color: isFrozen ? 'var(--blue)' : isTasted ? 'var(--green)' : 'var(--text-tertiary)',
                    opacity: isRemoved ? 0.6 : 1,
                  }}>
                    <span>#{c.section_number}</span>
                    <span style={{ fontSize: 10 }}>{isTasted ? '✓' : isRemoved ? '✕' : ''}</span>
                    {isFrozen && (
                      <button
                        type="button"
                        title="Remove from inventory"
                        disabled={removingId === c.id}
                        onClick={() => handleRemoveCube(c)}
                        style={{
                          marginLeft: 2, border: 'none', background: 'none', cursor: 'pointer',
                          color: 'var(--blue)', fontWeight: 700, fontSize: 12, lineHeight: 1, padding: '0 1px',
                          opacity: removingId === c.id ? 0.4 : 0.6,
                        }}
                      >×</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FreezeView() {
  const [tests, setTests] = useState([])
  const [batches, setBatches] = useState([])
  const [molds, setMolds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getFreezeTests(), api.getBatches(), api.getMolds()])
    .then(([t, b, m]) => { setTests(t); setBatches(b); setMolds(m) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateFreezeTest(editing.id, payload)
      setEditing(null)
    } else {
      await api.createFreezeTest(payload)
      setShowForm(false)
    }
    load()
  }

  const handleEdit = (test) => {
    setEditing(test)
    setShowForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        <FreezeForm batches={batches} molds={molds} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <FreezeForm batches={batches} molds={molds} initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : tests.length === 0
          ? <div className="empty-state"><p>No freeze tests logged yet.</p></div>
          : (
            <div className="card-list">
              {tests.map(t => <FreezeCard key={t.id} test={t} onEdit={handleEdit} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
