import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const SHAPES = ['Sphere', 'Cube', 'Collins Spear', 'Cylinder', 'Other']
const SHAPE_CODES = { 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }

function getMoldIdPreview(shape, volume_fl_oz, sections, num) {
  const code = SHAPE_CODES[shape] ?? 'OT'
  const vol = String(Math.round(Number(volume_fl_oz) || 0)).padStart(2, '0')
  const sec = String(Number(sections) || 0).padStart(2, '0')
  const n = String(Number(num) || 1).padStart(2, '0')
  return `${code}${vol}${sec}${n}`
}

function MoldForm({ existingMolds, initial, onSave, onCancel }) {
  const isEditing = !!initial
  const [form, setForm] = useState(() => initial ? {
    shape: initial.shape ?? 'Sphere',
    volume_fl_oz: initial.volume_fl_oz ?? '',
    sections: initial.sections ?? '',
    notes: initial.notes ?? '',
  } : { shape: 'Sphere', volume_fl_oz: '', sections: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const nextNum = existingMolds.filter(m =>
    m.shape === form.shape &&
    String(m.volume_fl_oz) === String(form.volume_fl_oz) &&
    String(m.sections) === String(form.sections)
  ).length + 1

  const previewNum = isEditing ? (initial?.mold_number ?? nextNum) : nextNum
  const preview = form.volume_fl_oz && form.sections
    ? getMoldIdPreview(form.shape, form.volume_fl_oz, form.sections, previewNum)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      volume_fl_oz: Number(form.volume_fl_oz),
      sections: Number(form.sections),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{isEditing ? 'Edit Mold' : 'Add Mold'}</h3>

      <div className="form-row three-col">
        <Field label="Shape *">
          <select required value={form.shape} onChange={e => set('shape', e.target.value)}>
            {SHAPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Volume (fl. oz) *">
          <input required type="number" step="0.25" min="0.25" value={form.volume_fl_oz} onChange={e => set('volume_fl_oz', e.target.value)} placeholder="2.0" />
        </Field>
        <Field label="Sections *">
          <input required type="number" min="1" value={form.sections} onChange={e => set('sections', e.target.value)} placeholder="6" />
        </Field>
      </div>

      {preview && (
        <div style={{ background: 'var(--accent-light)', border: '0.5px solid #c6d9b0', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Mold ID will be: </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{preview}</span>
        </div>
      )}

      <Field label="Notes">
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Brand, material, condition…" />
      </Field>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Add mold'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function CubeGrid({ mold }) {
  const [cubes, setCubes] = useState(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    const data = await api.getMoldCubes(mold.id)
    setCubes(data)
    setOpen(true)
  }

  const toggle = () => {
    if (!open) load()
    else setOpen(false)
  }

  return (
    <div>
      <button className="btn btn-sm btn-ghost" onClick={toggle} type="button">
        {open ? 'Hide Cubes' : 'View Cubes'}
      </button>
      {open && cubes && (
        <div style={{ marginTop: 12 }}>
          {cubes.length === 0 ? (
            <p className="text-sm text-muted">No cubes logged for this mold yet.</p>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                {cubes.length} cube{cubes.length !== 1 ? 's' : ''} tracked
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cubes.map(cube => (
                  <div key={cube.id} style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'var(--border)',
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 44,
                    textAlign: 'center',
                    background: cube.status === 'tasted' ? 'var(--green-light)' : cube.status === 'frozen' ? 'var(--blue-light)' : 'var(--bg)',
                    color: cube.status === 'tasted' ? 'var(--green)' : cube.status === 'frozen' ? 'var(--blue)' : 'var(--text-secondary)',
                  }}
                    title={cube.status === 'tasted' ? `Tasted${cube.tasting_date ? ` on ${cube.tasting_date}` : ''}${cube.taster ? ` by ${cube.taster}` : ''}` : cube.status}
                  >
                    #{cube.section_number}
                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>{cube.status}</div>
                  </div>
                ))}
              </div>
              {cubes.some(c => c.batch_label) && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Batch: {cubes.find(c => c.batch_label)?.batch_label} — {cubes.find(c => c.sku)?.sku}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MoldCard({ mold, onEdit, onDelete }) {
  const shapeCode = SHAPE_CODES[mold.shape] ?? 'OT'
  const vol = String(Math.round(mold.volume_fl_oz)).padStart(2, '0')
  const sec = String(mold.sections).padStart(2, '0')
  const num = String(mold.mold_number).padStart(2, '0')
  const moldId = `${shapeCode}${vol}${sec}${num}`

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{moldId}</span>
          <span className="text-sm text-muted">{mold.shape}</span>
          <span className="text-sm text-muted">{mold.volume_fl_oz} fl. oz</span>
          <span className="text-sm text-muted">{mold.sections} sections</span>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(mold)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(mold.id)}>Delete</button>
        </div>
      </div>
      <div className="card-body">
        {mold.notes && <p className="text-sm text-muted" style={{ marginBottom: 10 }}>{mold.notes}</p>}
        <CubeGrid mold={mold} />
      </div>
    </div>
  )
}

export default function MoldsView() {
  const [molds, setMolds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.getMolds().then(setMolds).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateMold(editing.id, payload)
      setEditing(null)
    } else {
      await api.createMold(payload)
      setShowForm(false)
    }
    load()
  }

  const handleEdit = (mold) => {
    setEditing(mold)
    setShowForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this mold? Cube tracking records will also be removed.')) return
    await api.deleteMold(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Molds"
        action={
          <button className={`form-toggle-btn${showForm ? ' open' : ''}`} onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Add Mold'}
          </button>
        }
      />

      {showForm && (
        <MoldForm existingMolds={molds} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <MoldForm existingMolds={molds} initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <div className="empty-state"><p>Loading…</p></div>
      ) : molds.length === 0 ? (
        <div className="empty-state">
          <p>No molds registered yet.</p>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>Add a mold to enable cube tracking in Freeze Tests and Tastings.</p>
        </div>
      ) : (
        <div className="card-list">
          {molds.map(m => <MoldCard key={m.id} mold={m} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  )
}
