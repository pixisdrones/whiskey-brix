import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const PHASES = [
  { id: 'initial', label: 'Initial', sub: '0–3 min' },
  { id: 'opening', label: 'Opening', sub: '3–8 min' },
  { id: 'full', label: 'Full', sub: '8–12 min' },
]

const FLAVOR_DESCRIPTORS = [
  'Citrus', 'Lemon', 'Lime', 'Orange peel', 'Grapefruit',
  'Honey', 'Floral', 'Herbal', 'Mint', 'Rosemary', 'Lavender',
  'Berry', 'Cherry', 'Cranberry', 'Stone fruit',
  'Smoke', 'Oak', 'Vanilla', 'Caramel', 'Maple',
  'Bitters', 'Tart', 'Bitter', 'Spice', 'Ginger', 'Warm finish',
]

const SPIRIT_TYPES = ['Bourbon', 'Whiskey', 'Scotch', 'Rye', 'Gin', 'Tequila', 'Mezcal', 'Vodka', 'Rum', 'Other']
const MELT_TIMINGS = ['too fast', 'just right', 'too slow']

function emptyPhase(id) {
  return {
    phase: id, aroma_intensity: 3, sweetness: 3, acidity: 3, body: 3,
    flavor_descriptors: [], notes: ''
  }
}

function SliderField({ label, value, min = 1, max = 5, onChange }) {
  return (
    <Field label={`${label}: ${value}`}>
      <div className="slider-row">
        <input
          type="range" min={min} max={max} step="1"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <span className="slider-value">{value}</span>
      </div>
    </Field>
  )
}

function PhasePanel({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const toggleDescriptor = (d) => {
    const current = data.flavor_descriptors ?? []
    set('flavor_descriptors', current.includes(d) ? current.filter(x => x !== d) : [...current, d])
  }

  return (
    <div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <SliderField label="Aroma" value={data.aroma_intensity} onChange={v => set('aroma_intensity', v)} />
        <SliderField label="Sweetness" value={data.sweetness} onChange={v => set('sweetness', v)} />
        <SliderField label="Acidity" value={data.acidity} onChange={v => set('acidity', v)} />
        <SliderField label="Body" value={data.body} onChange={v => set('body', v)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Flavor Descriptors
        </label>
        <div className="descriptor-grid">
          {FLAVOR_DESCRIPTORS.map(d => (
            <button
              key={d}
              type="button"
              className={`descriptor-btn${(data.flavor_descriptors ?? []).includes(d) ? ' selected' : ''}`}
              onClick={() => toggleDescriptor(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Field label="Phase Notes">
        <textarea
          value={data.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Tasting notes for this phase…"
          style={{ minHeight: 56 }}
        />
      </Field>
    </div>
  )
}

function TastingForm({ batches, freezeTests, onSave, onCancel }) {
  const [activePhase, setActivePhase] = useState('initial')
  const [phases, setPhases] = useState({
    initial: emptyPhase('initial'),
    opening: emptyPhase('opening'),
    full: emptyPhase('full'),
  })
  const [form, setForm] = useState({
    batch_id: '', freeze_test_id: '', date: new Date().toISOString().slice(0, 10),
    taster: '', spirit_type: 'Bourbon', spirit_brand: '',
    spirit_integration: 3, melt_timing: 'just right',
    ritual_satisfaction: 3, overall_score: 7,
    recommended_revision: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPhase = (pid, data) => setPhases(p => ({ ...p, [pid]: data }))

  const availableFreezeTests = form.batch_id
    ? freezeTests.filter(ft => ft.batch_id === form.batch_id)
    : freezeTests

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      freeze_test_id: form.freeze_test_id || null,
      spirit_integration: Number(form.spirit_integration),
      ritual_satisfaction: Number(form.ritual_satisfaction),
      overall_score: Number(form.overall_score),
      timepoints: PHASES.map(p => phases[p.id]),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>Log Tasting</h3>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => { set('batch_id', e.target.value); set('freeze_test_id', '') }}>
            <option value="">— select batch —</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} – {b.sku}</option>
            ))}
          </select>
        </Field>
        <Field label="Freeze Test (optional)">
          <select value={form.freeze_test_id} onChange={e => set('freeze_test_id', e.target.value)}>
            <option value="">— none —</option>
            {availableFreezeTests.map(ft => (
              <option key={ft.id} value={ft.id}>{ft.batch_label || ft.batch_id?.slice(0, 8)} – {ft.mold_type || ft.id.slice(0, 8)} – {ft.date}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Taster">
          <input value={form.taster} onChange={e => set('taster', e.target.value)} placeholder="Name" />
        </Field>
      </div>

      <div className="form-row three-col">
        <Field label="Spirit Type">
          <select value={form.spirit_type} onChange={e => set('spirit_type', e.target.value)}>
            {SPIRIT_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Spirit Brand" style={{ gridColumn: 'span 2' }}>
          <input value={form.spirit_brand} onChange={e => set('spirit_brand', e.target.value)} placeholder="e.g. Buffalo Trace" />
        </Field>
      </div>

      {/* Phase evaluation */}
      <div style={{ background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius)', padding: 20, margin: '16px 0' }}>
        <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 13 }}>Time-Indexed Evaluation</div>
        <div className="phase-tabs">
          {PHASES.map(p => (
            <button
              key={p.id}
              type="button"
              className={`phase-tab${activePhase === p.id ? ' active' : ''}`}
              onClick={() => setActivePhase(p.id)}
            >
              {p.label} <span style={{ fontSize: 11, fontWeight: 400, color: 'inherit', opacity: 0.7 }}>{p.sub}</span>
            </button>
          ))}
        </div>
        <PhasePanel
          data={phases[activePhase]}
          onChange={data => setPhase(activePhase, data)}
        />
      </div>

      {/* Overall */}
      <div style={{ background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 13 }}>Overall Assessment</div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <SliderField label="Spirit Integration" value={form.spirit_integration} onChange={v => set('spirit_integration', v)} />
          <SliderField label="Ritual Satisfaction" value={form.ritual_satisfaction} onChange={v => set('ritual_satisfaction', v)} />
          <SliderField label="Overall Score" value={form.overall_score} min={1} max={10} onChange={v => set('overall_score', v)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Melt Timing
          </label>
          <div className="flex gap-8">
            {MELT_TIMINGS.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio" name="melt_timing" value={t}
                  checked={form.melt_timing === t}
                  onChange={() => set('melt_timing', t)}
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <Field label="Recommended Revision">
          <textarea
            value={form.recommended_revision}
            onChange={e => set('recommended_revision', e.target.value)}
            placeholder="Suggested changes for next batch…"
            style={{ minHeight: 56 }}
          />
        </Field>
      </div>

      <div className="flex gap-8">
        <button type="submit" className="btn btn-primary">Log tasting</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function TastingCard({ tasting, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const allDescriptors = (tasting.timepoints ?? [])
    .flatMap(tp => {
      try { return JSON.parse(tp.flavor_descriptors || '[]') }
      catch { return [] }
    })
  const uniqueDescriptors = [...new Set(allDescriptors)]

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{tasting.sku || tasting.batch_label}</span>
          {tasting.taster && <span className="text-sm text-muted">{tasting.taster}</span>}
          {tasting.spirit_brand && (
            <span className="text-sm" style={{ color: 'var(--amber)' }}>{tasting.spirit_type} – {tasting.spirit_brand}</span>
          )}
          {tasting.date && <span className="text-sm text-muted">{tasting.date}</span>}
          {tasting.overall_score && (
            <span style={{
              background: tasting.overall_score >= 7 ? 'var(--green-light)' : tasting.overall_score >= 5 ? 'var(--amber-light)' : 'var(--red-light)',
              color: tasting.overall_score >= 7 ? 'var(--green)' : tasting.overall_score >= 5 ? 'var(--amber)' : 'var(--red)',
              borderRadius: 100, padding: '2px 10px', fontSize: 13, fontWeight: 700
            }}>
              {tasting.overall_score}/10
            </span>
          )}
        </div>
        <div className="flex gap-8 items-center">
          {(tasting.timepoints?.length > 0) && (
            <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(tasting.id)}>Delete</button>
        </div>
      </div>
      <div className="card-body">
        <div className="targets">
          {tasting.spirit_integration != null && (
            <div className="target-item">
              <span className="target-label">Spirit Integration</span>
              <span className="target-value">{tasting.spirit_integration}/5</span>
            </div>
          )}
          {tasting.ritual_satisfaction != null && (
            <div className="target-item">
              <span className="target-label">Ritual Satisfaction</span>
              <span className="target-value">{tasting.ritual_satisfaction}/5</span>
            </div>
          )}
          {tasting.melt_timing && (
            <div className="target-item">
              <span className="target-label">Melt Timing</span>
              <span className="target-value"
                style={{ color: tasting.melt_timing === 'just right' ? 'var(--green)' : 'var(--amber)' }}>
                {tasting.melt_timing}
              </span>
            </div>
          )}
        </div>

        {uniqueDescriptors.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {uniqueDescriptors.map(d => (
              <span key={d} style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                {d}
              </span>
            ))}
          </div>
        )}

        {tasting.recommended_revision && (
          <p className="text-sm" style={{ marginTop: 8, color: 'var(--amber)', fontStyle: 'italic' }}>
            Revision: {tasting.recommended_revision}
          </p>
        )}

        {expanded && tasting.timepoints?.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: 'var(--border-subtle)' }}>
            {tasting.timepoints.map(tp => {
              let descriptors = []
              try { descriptors = JSON.parse(tp.flavor_descriptors || '[]') } catch {}
              return (
                <div key={tp.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    {PHASES.find(p => p.id === tp.phase)?.label ?? tp.phase} phase
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                    {[
                      ['Aroma', tp.aroma_intensity],
                      ['Sweetness', tp.sweetness],
                      ['Acidity', tp.acidity],
                      ['Body', tp.body],
                    ].map(([lbl, val]) => val != null && (
                      <div key={lbl} style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{lbl}: </span>
                        <span style={{ fontWeight: 600 }}>{val}/5</span>
                      </div>
                    ))}
                  </div>
                  {descriptors.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                      {descriptors.map(d => (
                        <span key={d} style={{ background: '#f0f0f0', color: '#555', borderRadius: 100, padding: '1px 7px', fontSize: 11 }}>{d}</span>
                      ))}
                    </div>
                  )}
                  {tp.notes && <p className="text-sm text-muted">{tp.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TastingsView() {
  const [tastings, setTastings] = useState([])
  const [batches, setBatches] = useState([])
  const [freezeTests, setFreezeTests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getTastings(), api.getBatches(), api.getFreezeTests()])
    .then(([t, b, ft]) => { setTastings(t); setBatches(b); setFreezeTests(ft) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    await api.createTasting(payload)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this tasting?')) return
    await api.deleteTasting(id)
    load()
  }

  return (
    <div>
      <SectionHeader
        title="Tastings"
        action={
          <button className={`form-toggle-btn${showForm ? ' open' : ''}`} onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Log Tasting'}
          </button>
        }
      />

      {showForm && (
        <TastingForm
          batches={batches}
          freezeTests={freezeTests}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : tastings.length === 0
          ? <div className="empty-state"><p>No tastings logged yet.</p></div>
          : (
            <div className="card-list">
              {tastings.map(t => <TastingCard key={t.id} tasting={t} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
