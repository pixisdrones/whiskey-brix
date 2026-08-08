import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const PHASES = [
  { id: 'initial_pour', label: 'Initial Pour', sub: '0–3 min' },
  { id: 'first_drink', label: 'First Drink', sub: '3–5 min' },
  { id: 'bloom', label: 'Bloom', sub: '5–15 min' },
  { id: 'ideal_cocktail', label: 'Ideal Cocktail', sub: '15–25 min' },
  { id: 'full_integration', label: 'Full Integration', sub: '25+ min' },
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

const METRICS = [
  { key: 'aroma_intensity', label: 'Aroma',     color: '#8b5cf6' },
  { key: 'sweetness',       label: 'Sweetness', color: '#f59e0b' },
  { key: 'acidity',         label: 'Acidity',   color: '#ef4444' },
  { key: 'body',            label: 'Body',       color: '#3b82f6' },
]

function emptyPhase(id) {
  return {
    phase: id, aroma_intensity: 3, sweetness: 3, acidity: 3, body: 3,
    flavor_descriptors: [], cube_melt_pct: '', notes: '', elapsed_minutes: '', photo_url: null, observation_time: '',
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

function PhasePanel({ data, onChange, freezerOutTime, pourTime }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const [uploading, setUploading] = useState(false)
  const toggleDescriptor = (d) => {
    const current = data.flavor_descriptors ?? []
    set('flavor_descriptors', current.includes(d) ? current.filter(x => x !== d) : [...current, d])
  }
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadPhasePhoto(file)
      set('photo_url', url)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const refTime = freezerOutTime || pourTime
  const handleObsTime = (v) => {
    const update = { ...data, observation_time: v }
    if (v && refTime) {
      const [oh, om] = v.split(':').map(Number)
      const [rh, rm] = refTime.split(':').map(Number)
      const diff = (oh * 60 + om) - (rh * 60 + rm)
      if (diff >= 0) update.elapsed_minutes = String(diff)
    }
    onChange(update)
  }
  const elapsedAutoCalc = !!(data.observation_time && refTime)

  return (
    <div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <SliderField label="Aroma" value={data.aroma_intensity} onChange={v => set('aroma_intensity', v)} />
        <SliderField label="Sweetness" value={data.sweetness} onChange={v => set('sweetness', v)} />
        <SliderField label="Acidity" value={data.acidity} onChange={v => set('acidity', v)} />
        <SliderField label="Body" value={data.body} onChange={v => set('body', v)} />
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Field label="% Cube Melt">
          <input
            type="number" min="0" max="100" step="1"
            value={data.cube_melt_pct}
            onChange={e => set('cube_melt_pct', e.target.value)}
            placeholder="0–100"
          />
        </Field>
        <Field label="Observation Time">
          <input
            type="time"
            value={data.observation_time}
            onChange={e => handleObsTime(e.target.value)}
          />
        </Field>
        <Field label="Elapsed (min)">
          <input
            type="number" min="0" max="120" step="1"
            value={data.elapsed_minutes}
            onChange={e => set('elapsed_minutes', e.target.value)}
            placeholder="0"
            disabled={elapsedAutoCalc}
            style={elapsedAutoCalc ? { opacity: 0.7 } : {}}
          />
        </Field>
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

      <div className="form-row two-col" style={{ alignItems: 'flex-start' }}>
        <Field label="Phase Notes">
          <textarea
            value={data.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Tasting notes for this phase…"
            style={{ minHeight: 56 }}
          />
        </Field>
        <Field label="Photo">
          <div>
            {data.photo_url && (
              <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                <img src={data.photo_url} alt="phase observation" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 4, objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => set('photo_url', null)}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            )}
            <label style={{ display: 'inline-block', cursor: uploading ? 'default' : 'pointer' }}>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} disabled={uploading} />
              <span className="btn btn-sm" style={{ opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Uploading…' : data.photo_url ? 'Replace photo' : '+ Add photo'}
              </span>
            </label>
          </div>
        </Field>
      </div>
    </div>
  )
}

// Searchable tester dropdown — filters testers list as the user types,
// but also accepts free-text for testers not yet in the database.
function TasterSearch({ testers, value, onChange }) {
  const [open, setOpen] = useState(false)
  const filtered = testers.filter(t =>
    value.length === 0 ||
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(value.toLowerCase())
  )
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search tester…"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card)', border: 'var(--border)',
          borderRadius: 'var(--radius-sm)', zIndex: 100,
          maxHeight: 180, overflowY: 'auto', marginTop: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onMouseDown={() => { onChange(`${t.first_name} ${t.last_name}`); setOpen(false) }}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: 'var(--border-subtle)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{t.first_name} {t.last_name}</span>
              {t.avg_score != null && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>avg {t.avg_score}/10</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TastingForm({ batches, freezeTests, molds, testers, initial, onSave, onCancel }) {
  const isEditing = !!initial
  const [activePhase, setActivePhase] = useState('initial_pour')
  const [phases, setPhases] = useState(() => {
    if (initial?.timepoints?.length) {
      const phaseMap = {}
      initial.timepoints.forEach(tp => {
        phaseMap[tp.phase] = {
          phase: tp.phase,
          aroma_intensity: tp.aroma_intensity ?? 3,
          sweetness: tp.sweetness ?? 3,
          acidity: tp.acidity ?? 3,
          body: tp.body ?? 3,
          flavor_descriptors: Array.isArray(tp.flavor_descriptors) ? tp.flavor_descriptors : [],
          cube_melt_pct: tp.cube_melt_pct ?? '',
          notes: tp.notes ?? '',
          elapsed_minutes: tp.elapsed_minutes ?? '',
          photo_url: tp.photo_url ?? null,
          observation_time: tp.observation_time ?? '',
        }
      })
      return Object.fromEntries(PHASES.map(p => [p.id, phaseMap[p.id] ?? emptyPhase(p.id)]))
    }
    return Object.fromEntries(PHASES.map(p => [p.id, emptyPhase(p.id)]))
  })
  const [form, setForm] = useState(() => initial ? {
    batch_id: initial.batch_id ?? '',
    freeze_test_id: initial.freeze_test_id ?? '',
    cube_id: initial.cube_id ?? '',
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    pour_time: initial.pour_time ?? '',
    freezer_out_time: initial.freezer_out_time ?? '',
    freezer_out_temp: initial.freezer_out_temp ?? '',
    taster: initial.taster ?? '',
    spirit_type: initial.spirit_type ?? 'Bourbon',
    spirit_brand: initial.spirit_brand ?? '',
    spirit_volume: initial.spirit_volume ?? '',
    spirit_integration: initial.spirit_integration ?? 3,
    melt_timing: initial.melt_timing ?? 'just right',
    ritual_satisfaction: initial.ritual_satisfaction ?? 3,
    overall_score: initial.overall_score ?? 7,
    recommended_revision: initial.recommended_revision ?? '',
  } : {
    batch_id: '', freeze_test_id: '', cube_id: '',
    date: new Date().toISOString().slice(0, 10),
    pour_time: '',
    freezer_out_time: '', freezer_out_temp: '',
    taster: '', spirit_type: 'Bourbon', spirit_brand: '', spirit_volume: '',
    spirit_integration: 3, melt_timing: 'just right',
    ritual_satisfaction: 3, overall_score: 7,
    recommended_revision: ''
  })
  const [availableCubes, setAvailableCubes] = useState([])
  const [allMoldCubes, setAllMoldCubes] = useState([])
  const [tastingLabel, setTastingLabel] = useState(initial?.tasting_label ?? '')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPhase = (pid, data) => setPhases(p => ({ ...p, [pid]: data }))

  const availableFreezeTests = form.batch_id
    ? freezeTests.filter(ft => ft.batch_id === form.batch_id)
    : freezeTests

  // Fetch tasting label on mount (new tastings only)
  useEffect(() => {
    if (isEditing) return
    api.getNextTastingLabel().then(({ tasting_label }) => setTastingLabel(tasting_label)).catch(() => {})
  }, [])

  // Load cubes when freeze_test_id changes
  useEffect(() => {
    if (!form.freeze_test_id) { setAvailableCubes([]); setAllMoldCubes([]); return }
    api.getFreezeCubes(form.freeze_test_id).then(cubes => {
      setAllMoldCubes(cubes)
      setAvailableCubes(initial?.cube_id
        ? cubes.filter(c => c.status === 'frozen' || c.id === initial.cube_id)
        : cubes.filter(c => c.status === 'frozen'))
    })
  }, [form.freeze_test_id])

  const frozenCount  = allMoldCubes.filter(c => c.status === 'frozen').length
  const tastedCount  = allMoldCubes.filter(c => c.status === 'tasted').length
  const removedCount = allMoldCubes.filter(c => c.status === 'removed').length

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      freeze_test_id: form.freeze_test_id || null,
      cube_id: form.cube_id || null,
      spirit_volume: form.spirit_volume === '' ? null : Number(form.spirit_volume),
      freezer_out_time: form.freezer_out_time || null,
      freezer_out_temp: form.freezer_out_temp === '' ? null : Number(form.freezer_out_temp),
      spirit_integration: Number(form.spirit_integration),
      ritual_satisfaction: Number(form.ritual_satisfaction),
      overall_score: Number(form.overall_score),
      timepoints: PHASES.map(p => ({
        ...phases[p.id],
        cube_melt_pct: phases[p.id].cube_melt_pct === '' ? null : Number(phases[p.id].cube_melt_pct),
        elapsed_minutes: phases[p.id].elapsed_minutes === '' ? null : Number(phases[p.id].elapsed_minutes),
        observation_time: phases[p.id].observation_time || null,
      })),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3>{isEditing ? 'Edit Tasting' : 'Log Tasting'}</h3>
        {tastingLabel && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Tasting ID</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>{tastingLabel}</div>
          </div>
        )}
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => { set('batch_id', e.target.value); set('freeze_test_id', ''); set('cube_id', '') }}>
            <option value="">— select batch —</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} – {b.sku}</option>
            ))}
          </select>
        </Field>
        <Field label="Freeze Log (optional)">
          <select value={form.freeze_test_id} onChange={e => { set('freeze_test_id', e.target.value); set('cube_id', '') }}>
            <option value="">— none —</option>
            {availableFreezeTests.map(ft => {
              const moldCode = ft.mold_shape
                ? ({ 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }[ft.mold_shape] ?? 'OT')
                : null
              return (
                <option key={ft.id} value={ft.id}>
                  {ft.batch_label || ft.batch_id?.slice(0, 8)} – {moldCode ? `${moldCode} ${ft.mold_volume}oz` : (ft.mold_type || ft.id.slice(0, 8))} – {ft.date}
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Cube">
          <select value={form.cube_id} onChange={e => set('cube_id', e.target.value)} disabled={availableCubes.length === 0}>
            <option value="">— {availableCubes.length === 0 ? 'no frozen cubes' : 'select cube'} —</option>
            {availableCubes.map(c => (
              <option key={c.id} value={c.id}>Section #{c.section_number}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Freezer Out Time">
          <input type="time" value={form.freezer_out_time} onChange={e => set('freezer_out_time', e.target.value)} />
        </Field>
        <Field label="Pour Time">
          <input type="time" value={form.pour_time} onChange={e => set('pour_time', e.target.value)} />
        </Field>
        <Field label="Freezer Out Temp (°F)">
          <input type="number" step="1" value={form.freezer_out_temp} onChange={e => set('freezer_out_temp', e.target.value)} placeholder="28" />
        </Field>
      </div>

      {/* Cube inventory status */}
      {allMoldCubes.length > 0 && (
        <div style={{ background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Cube Inventory
            <span style={{ fontWeight: 400, marginLeft: 8 }}>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{frozenCount}</span> available &nbsp;·&nbsp;
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{tastedCount}</span> tasted
              {removedCount > 0 && <> &nbsp;·&nbsp; <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{removedCount}</span> removed</>}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {allMoldCubes.map(c => (
              <div key={c.id} style={{
                padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'var(--border)',
                fontSize: 11, fontWeight: 600, textAlign: 'center',
                background: c.status === 'tasted' ? 'var(--green-light)' : 'var(--blue-light)',
                color: c.status === 'tasted' ? 'var(--green)' : 'var(--blue)',
                outline: form.cube_id === c.id ? '2px solid var(--accent)' : 'none',
              }}>
                #{c.section_number}
                <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.75 }}>{c.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Taster">
          <TasterSearch testers={testers} value={form.taster} onChange={v => set('taster', v)} />
        </Field>
        <Field label="Spirit Type">
          <select value={form.spirit_type} onChange={e => set('spirit_type', e.target.value)}>
            {SPIRIT_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Spirit Brand">
          <input value={form.spirit_brand} onChange={e => set('spirit_brand', e.target.value)} placeholder="e.g. Buffalo Trace" />
        </Field>
        <Field label="Spirit Volume (oz)">
          <input type="number" step="0.25" min="0" value={form.spirit_volume} onChange={e => set('spirit_volume', e.target.value)} placeholder="2.0" />
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
          freezerOutTime={form.freezer_out_time}
          pourTime={form.pour_time}
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
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Log tasting'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function Sparkline({ label, color, values }) {
  const H = 36
  const padY = 7
  const plotH = H - padY * 2
  const n = values.length
  const xPct = i => `${n > 1 ? 4 + (i / (n - 1)) * 92 : 50}%`
  const yOf  = v => v == null ? null : padY + (1 - (v - 1) / 4) * plotH

  const hasTwoPoints = values.filter(v => v != null).length >= 2
  if (!hasTwoPoints) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color, width: 58, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{label}</span>
      <svg width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* mid-range reference line */}
        <line x1="4%" y1={yOf(3)} x2="96%" y2={yOf(3)} stroke="#e5e7eb" strokeWidth="1" />
        {/* line segments */}
        {values.map((v, i) => {
          if (i === 0 || v == null || values[i - 1] == null) return null
          return (
            <line key={i}
              x1={xPct(i - 1)} y1={yOf(values[i - 1])}
              x2={xPct(i)} y2={yOf(v)}
              stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          )
        })}
        {/* dots + value labels */}
        {values.map((v, i) => v == null ? null : (
          <g key={i}>
            <circle cx={xPct(i)} cy={yOf(v)} r="3" fill={color} />
            <text x={xPct(i)} y={yOf(v) - 5}
              textAnchor="middle" fontSize="9" fill={color} fontWeight="600"
              style={{ userSelect: 'none' }}>{v}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function RadarChart({ timepoints }) {
  const availPhases = PHASES.filter(p => timepoints.find(tp => tp.phase === p.id))
  const [selectedPhase, setSelectedPhase] = useState(availPhases[0]?.id ?? null)
  const tp = timepoints.find(t => t.phase === selectedPhase)

  const cx = 88, cy = 88, r = 60
  const axes = [
    { key: 'aroma_intensity', label: 'Aroma',     angle: -90, color: '#8b5cf6' },
    { key: 'sweetness',       label: 'Sweetness', angle: 0,   color: '#f59e0b' },
    { key: 'acidity',         label: 'Acidity',   angle: 90,  color: '#ef4444' },
    { key: 'body',            label: 'Body',       angle: 180, color: '#3b82f6' },
  ]
  const toXY = (deg, radius) => ({
    x: cx + Math.cos(deg * Math.PI / 180) * radius,
    y: cy + Math.sin(deg * Math.PI / 180) * radius,
  })
  const valR = v => ((Math.max(1, v ?? 1) - 1) / 4) * r
  const dataPoints = tp ? axes.map(ax => toXY(ax.angle, valR(tp[ax.key]))) : []
  const dataPoly = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  if (availPhases.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
        {availPhases.map(p => (
          <button key={p.id} type="button"
            onClick={() => setSelectedPhase(p.id)}
            style={{
              padding: '2px 6px', fontSize: 9, borderRadius: 3,
              border: '1px solid #e5e7eb',
              background: selectedPhase === p.id ? 'var(--accent)' : 'transparent',
              color: selectedPhase === p.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', lineHeight: 1.4,
            }}
          >{p.label}</button>
        ))}
      </div>
      <svg viewBox="0 0 176 176" style={{ width: '100%', height: 'auto' }}>
        {[2, 3, 4, 5].map(lv => {
          const gr = ((lv - 1) / 4) * r
          const pts = axes.map(ax => { const p = toXY(ax.angle, gr); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
          return <polygon key={lv} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={lv === 5 ? 1 : 0.5} />
        })}
        {axes.map(ax => {
          const end = toXY(ax.angle, r)
          return <line key={ax.key} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#e5e7eb" strokeWidth="0.75" />
        })}
        {tp && dataPoints.length === 4 && (
          <polygon points={dataPoly} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
        )}
        {tp && axes.map(ax => {
          const pt = toXY(ax.angle, valR(tp[ax.key]))
          return <circle key={ax.key} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r="3.5" fill={ax.color} />
        })}
        {axes.map(ax => {
          const lpt = toXY(ax.angle, r + 14)
          return (
            <text key={ax.key} x={lpt.x.toFixed(1)} y={lpt.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fill={ax.color} fontWeight="600"
              style={{ userSelect: 'none' }}
            >{ax.label}</text>
          )
        })}
      </svg>
    </div>
  )
}

function TastingCard({ tasting, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const allDescriptors = (tasting.timepoints ?? [])
    .flatMap(tp => Array.isArray(tp.flavor_descriptors) ? tp.flavor_descriptors : [])
  const uniqueDescriptors = [...new Set(allDescriptors)]

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          {tasting.tasting_label && (
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{tasting.tasting_label}</span>
          )}
          <span style={{ fontWeight: 700 }}>{tasting.expression || tasting.sku || tasting.batch_label}</span>
          {tasting.expression && <span className="text-sm text-muted">{tasting.sku}</span>}
          {tasting.taster && <span className="text-sm text-muted">{tasting.taster}</span>}
          {tasting.spirit_brand && (
            <span className="text-sm" style={{ color: 'var(--amber)' }}>
              {tasting.spirit_type} – {tasting.spirit_brand}
              {tasting.spirit_volume ? ` (${tasting.spirit_volume} oz)` : ''}
            </span>
          )}
          {tasting.mold_shape && tasting.section_number && (
            <span className="text-sm text-muted">
              Cube #{tasting.section_number} — {tasting.mold_shape} {tasting.mold_volume} fl. oz
            </span>
          )}
          {tasting.date && (
            <span className="text-sm text-muted">
              {tasting.date}
              {tasting.freezer_out_time ? ` · out ${tasting.freezer_out_time}` : ''}
              {tasting.pour_time ? ` · pour ${tasting.pour_time}` : ''}
            </span>
          )}
          {tasting.freezer_out_temp != null && (
            <span className="text-sm" style={{ color: 'var(--blue)' }}>{tasting.freezer_out_temp}°F</span>
          )}
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
          <button className="btn btn-sm" onClick={() => onEdit(tasting)}>Edit</button>
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

            {/* Sparkline overview */}
            {(() => {
              const ordered = PHASES.map(p => tasting.timepoints.find(tp => tp.phase === p.id) ?? null)
              const anySparkline = METRICS.some(m => ordered.filter(tp => tp?.[m.key] != null).length >= 2)
              if (!anySparkline) return null
              return (
                <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: 'var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 8 }}>Evaluation Trends</div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {METRICS.map(m => (
                        <Sparkline
                          key={m.key}
                          label={m.label}
                          color={m.color}
                          values={ordered.map(tp => tp?.[m.key] ?? null)}
                        />
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ width: 58, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', padding: '0 4%' }}>
                          {['Pour', '1st drink', 'Bloom', 'Ideal', 'Full'].map(l => (
                            <span key={l} style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center' }}>{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <RadarChart timepoints={tasting.timepoints} />
                    </div>
                  </div>
                </div>
              )
            })()}

            {PHASES
              .map(p => tasting.timepoints.find(tp => tp.phase === p.id))
              .filter(Boolean)
              .map(tp => {
              const phase = PHASES.find(p => p.id === tp.phase)
              const descriptors = Array.isArray(tp.flavor_descriptors) ? tp.flavor_descriptors : []
              return (
                <div key={tp.id || tp.phase} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: 'var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{phase ? `${phase.label} (${phase.sub})` : tp.phase}</span>
                    {tp.observation_time && (
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 11 }}>{tp.observation_time}</span>
                    )}
                    {tp.elapsed_minutes != null && (
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11 }}>@ {tp.elapsed_minutes} min</span>
                    )}
                    {tp.cube_melt_pct != null && (
                      <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{tp.cube_melt_pct}% melt</span>
                    )}
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
                  {tp.photo_url && (
                    <a href={tp.photo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>
                      <img src={tp.photo_url} alt="observation" style={{ maxWidth: 180, maxHeight: 135, borderRadius: 4, objectFit: 'cover' }} />
                    </a>
                  )}
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
  const [molds, setMolds] = useState([])
  const [testers, setTesters] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getTastings(), api.getBatches(), api.getFreezeTests(), api.getMolds(), api.getTesters()])
    .then(([t, b, ft, m, tr]) => { setTastings(t); setBatches(b); setFreezeTests(ft); setMolds(m); setTesters(tr) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateTasting(editing.id, payload)
      setEditing(null)
    } else {
      await api.createTasting(payload)
      setShowForm(false)
    }
    load()
  }

  const handleEdit = (tasting) => {
    setEditing(tasting)
    setShowForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          molds={molds}
          testers={testers}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <TastingForm
          batches={batches}
          freezeTests={freezeTests}
          molds={molds}
          testers={testers}
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : tastings.length === 0
          ? <div className="empty-state"><p>No tastings logged yet.</p></div>
          : (
            <div className="card-list">
              {tastings.map(t => <TastingCard key={t.id} tasting={t} onEdit={handleEdit} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
