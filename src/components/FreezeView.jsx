import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'
import { RECIPE_PALETTE, recipeColor } from '../utils/recipeColors.js'

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

  const [sectionBatches, setSectionBatches] = useState({})
  const [paintBatch, setPaintBatch] = useState(null)
  const [paletteExtras, setPaletteExtras] = useState([])

  useEffect(() => {
    if (!isEditing) {
      setSectionBatches({})
      setPaletteExtras([])
      setPaintBatch(null)
    }
  }, [form.mold_id])

  const selectedBatch = batches.find(b => b.id === form.batch_id)
  const selectedMold = molds.find(m => m.id === form.mold_id)
  const moldVolume = selectedMold ? selectedMold.volume_fl_oz : null

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
    const sectionBatchOverrides = {}
    let hasMultiple = false
    for (const [sec, bid] of Object.entries(sectionBatches)) {
      if (bid !== form.batch_id) { sectionBatchOverrides[sec] = bid; hasMultiple = true }
    }
    await onSave({
      ...form,
      volume_fl_oz: form.volume_fl_oz !== '' ? Number(form.volume_fl_oz) : (moldVolume ?? null),
      freezer_temp: form.freezer_temp === '' ? null : Number(form.freezer_temp),
      freezer_out_temp: form.freezer_out_temp === '' ? null : Number(form.freezer_out_temp),
      qty_cubes: form.qty_cubes === '' ? null : Number(form.qty_cubes),
      hardness: Number(form.hardness),
      mold_id: form.mold_id || null,
      section_batches: hasMultiple ? sectionBatchOverrides : null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{isEditing ? 'Edit Freeze Log' : 'New Freeze Log'}</h3>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
            <option value="">-- select batch --</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} - {b.sku}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Mold">
          <select value={form.mold_id} onChange={e => set('mold_id', e.target.value)}>
            <option value="">-- select mold (optional) --</option>
            {molds.map(m => {
              const shapeCode = { 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }[m.shape] ?? 'OT'
              const moldId = `${shapeCode}${String(Math.round(m.volume_fl_oz)).padStart(2,'0')}${String(m.sections).padStart(2,'0')}${String(m.mold_number).padStart(2,'0')}`
              return <option key={m.id} value={m.id}>{moldId} - {m.shape} {m.volume_fl_oz} fl. oz, {m.sections} sections</option>
            })}
          </select>
        </Field>
      </div>
      {selectedBatch && selectedBatch.melt_min != null && (
        <div style={{ background: 'var(--blue-light)', border: '0.5px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>Target melt: </span>
          <span style={{ fontSize: 12, color: 'var(--blue)' }}>{selectedBatch.melt_min}-{selectedBatch.melt_max} min</span>
        </div>
      )}
      {selectedMold && !isEditing && form.batch_id && (() => {
        const total = selectedMold.sections
        const numRows = Math.ceil(total / 2)
        const batchById = Object.fromEntries(batches.map(b => [b.id, b]))
        const display = []
        for (let r = numRows - 1; r >= 0; r--) {
          display.push(r * 2 + 1)
          display.push(r * 2 + 2 <= total ? r * 2 + 2 : null)
        }
        const effectivePaint = paintBatch ?? form.batch_id
        return (
          <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: 'var(--border)', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Section Assignments
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
              {(() => {
                const pb = batchById[form.batch_id]
                const color = recipeColor(pb?.expression)
                const isActive = !paintBatch || paintBatch === form.batch_id
                return pb ? (
                  <button type="button" onClick={() => setPaintBatch(null)}
                    style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4,
                      background: color?.bg ?? 'var(--blue-light)', color: color?.text ?? 'var(--blue)',
                      border: `2px solid ${isActive ? (color?.border ?? 'var(--blue)') : 'transparent'}` }}>
                    {pb.expression || pb.sku}
                  </button>
                ) : null
              })()}
              {paletteExtras.map(bid => {
                const eb = batchById[bid]
                if (!eb) return null
                const color = recipeColor(eb.expression)
                const isActive = paintBatch === bid
                return (
                  <span key={bid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <button type="button" onClick={() => setPaintBatch(bid)}
                      style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4,
                        background: color?.bg ?? '#f3f4f6', color: color?.text ?? 'var(--text-secondary)',
                        border: `2px solid ${isActive ? (color?.border ?? '#e5e7eb') : 'transparent'}` }}>
                      {eb.expression || eb.sku}
                    </button>
                    <button type="button" onClick={() => { setPaletteExtras(p => p.filter(id => id !== bid)); if (paintBatch === bid) setPaintBatch(null) }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-tertiary)', padding: '0 2px', lineHeight: 1 }}>×</button>
                  </span>
                )
              })}
              <select value="" onChange={e => {
                const bid = e.target.value
                if (bid && !paletteExtras.includes(bid) && bid !== form.batch_id) {
                  setPaletteExtras(p => [...p, bid])
                  setPaintBatch(bid)
                }
                e.target.value = ''
              }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, border: '1px dashed #ccc', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <option value="">+ Add batch</option>
                {batches.filter(b => b.id !== form.batch_id && !paletteExtras.includes(b.id))
                  .map(b => <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} – {b.expression || b.sku}</option>)}
              </select>
              <button type="button" onClick={() => {
                const map = {}
                for (let s = 1; s <= total; s++) map[String(s)] = effectivePaint
                setSectionBatches(map)
              }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, border: 'var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: 4 }}>
                Fill all
              </button>
              {Object.values(sectionBatches).some(bid => bid !== form.batch_id) && (
                <button type="button" onClick={() => setSectionBatches({})}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, border: 'var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                  Reset
                </button>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3, textAlign: 'center' }}>Back</div>
            <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(2, 80px)', gap: 3 }}>
              {display.map((sNum, idx) => {
                if (sNum === null) return <div key={`pad-${idx}`} />
                const assignedId = sectionBatches[String(sNum)] ?? form.batch_id
                const assigned = batchById[assignedId]
                const color = recipeColor(assigned?.expression)
                return (
                  <div key={sNum} onClick={() => setSectionBatches(prev => ({ ...prev, [String(sNum)]: effectivePaint }))}
                    style={{ padding: '6px 4px', borderRadius: 4, textAlign: 'center', cursor: 'pointer', userSelect: 'none',
                      background: color?.bg ?? 'var(--bg)', border: `1.5px solid ${color?.border ?? '#e5e7eb'}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: color?.text ?? 'var(--text-tertiary)' }}>#{sNum}</div>
                    <div style={{ fontSize: 8, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: color?.text ?? 'var(--text-tertiary)' }}>
                      {assigned?.expression || assigned?.sku || '—'}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 3, textAlign: 'center' }}>Front (door)</div>
          </div>
        )
      })()}
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
        <Field label="fl. ozs.">
          <input type="number" step="0.25" value={form.volume_fl_oz || moldVolume || ''} onChange={e => set('volume_fl_oz', e.target.value)} placeholder={moldVolume ? `${moldVolume} (from mold)` : '2.0'} />
        </Field>
        <Field label="QTY Cubes">
          <input type="number" min="1" value={form.qty_cubes} onChange={e => set('qty_cubes', e.target.value)} placeholder={selectedMold?.sections ?? ''} />
        </Field>
        <Field label="Freezer In Temp (F)">
          <input type="number" step="0.1" value={form.freezer_temp} onChange={e => set('freezer_temp', e.target.value)} placeholder="-4" />
        </Field>
        <Field label="Freezer Out Temp (F)">
          <input type="number" step="0.1" value={form.freezer_out_temp} onChange={e => set('freezer_out_temp', e.target.value)} placeholder="-4" />
        </Field>
        <Field label="Freezer Location">
          <select value={form.freezer_location} onChange={e => set('freezer_location', e.target.value)}>
            <option value="">-- select --</option>
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
            {freezeTimeDisplay ?? '--'}
          </div>
        </Field>
      </div>
      <div className="form-row two-col">
        <Field label={`Hardness: ${form.hardness}/5`}>
          <div className="slider-row">
            <input type="range" min="1" max="5" step="1" value={form.hardness} onChange={e => set('hardness', e.target.value)} />
            <span className="slider-value">{form.hardness}</span>
          </div>
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations..." />
        </Field>
      </div>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Save to freeze log'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function FreezerInventory({ groups }) {
  if (!groups || groups.length === 0) return null
  const totalFrozen = groups.reduce((sum, g) => sum + g.cubes.filter(c => c.status === 'frozen').length, 0)

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2>Currently in Freezer</h2>
        <span className="text-muted text-sm">{totalFrozen} frozen &nbsp;·&nbsp; {groups.length} mold{groups.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {groups.map(group => {
          const totalSections = group.mold_sections ?? group.qty_cubes ?? group.cubes.length
          const cubeMap = Object.fromEntries(group.cubes.map(c => [c.section_number, c]))
          const frozenCount = group.cubes.filter(c => c.status === 'frozen').length
          const refTime = group.freezer_in_time ? new Date(group.freezer_in_time).getTime() : group.date ? new Date(group.date).getTime() : null
          const daysIn = refTime != null ? Math.floor((Date.now() - refTime) / 86400000) : null
          const moldTitle = [group.mold_shape, group.mold_volume ? `${group.mold_volume} oz` : null, totalSections ? `${totalSections}-section` : null].filter(Boolean).join(' · ')
          const frozenExpressions = [...new Set(group.cubes.filter(c => c.status === 'frozen' && c.expression).map(c => c.expression))]
          const numRows = Math.ceil(totalSections / 2)
          const displayOrder = []
          for (let r = numRows - 1; r >= 0; r--) {
            displayOrder.push(r * 2 + 1)
            displayOrder.push(r * 2 + 2 <= totalSections ? r * 2 + 2 : null)
          }
          return (
            <div key={group.id} style={{ border: 'var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{moldTitle || 'Mold'}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: group.freezer_location ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {group.freezer_location ? `${group.freezer_location}` : 'No location set'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {frozenExpressions.length > 0
                  ? frozenExpressions.map(expr => <span key={expr} style={{ color: recipeColor(expr)?.text ?? 'var(--text-secondary)', fontWeight: 600 }}>{expr}</span>)
                  : group.batch_label && <span style={{ color: 'var(--text-secondary)' }}>{group.batch_label}</span>}
                {group.date && <span>{group.date}</span>}
                {daysIn != null && <span style={{ fontWeight: 600, color: daysIn > 14 ? 'var(--amber)' : undefined }}>{daysIn}d</span>}
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{frozenCount} frozen</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3, textAlign: 'center' }}>Back</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 62px)', gap: 3 }}>
                {displayOrder.map((sectionNum, idx) => {
                  if (sectionNum === null) return <div key={`pad-${idx}`} />
                  const cube = cubeMap[sectionNum]
                  const status = cube?.status ?? 'empty'
                  const isFrozen = status === 'frozen'
                  const isTasted = status === 'tasted'
                  const isRemoved = status === 'removed'
                  const color = isFrozen ? recipeColor(cube?.expression) : null
                  const tooltip = cube?.batch_label ? `${cube.batch_label}${cube.expression ? ' · ' + cube.expression : ''}` : undefined
                  return (
                    <div key={sectionNum} title={tooltip} style={{ padding: '5px 3px', borderRadius: 3, textAlign: 'center', cursor: tooltip ? 'default' : undefined, opacity: status === 'empty' ? 0.28 : 1, background: color ? color.bg : isTasted ? '#d1fae5' : isRemoved ? '#f3f4f6' : 'var(--bg)', border: `1px solid ${color ? color.border : isTasted ? '#6ee7b7' : '#e5e7eb'}` }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: color ? color.text : isTasted ? 'var(--green)' : 'var(--text-tertiary)' }}>#{sectionNum}</div>
                      <div style={{ fontSize: 8, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: color ? color.text : isTasted ? 'var(--green)' : 'var(--text-tertiary)' }}>
                        {isTasted ? 'done' : isRemoved ? 'gone' : status === 'empty' ? '--' : (cube?.expression || cube?.sku || '?')}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 3, textAlign: 'center' }}>Front (door)</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FreezeCard({ test, molds, onEdit, onDelete, onCubeRemoved }) {
  const [cubes, setCubes] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => { api.getFreezeCubes(test.id).then(setCubes) }, [test.id])

  const handleRemoveCube = async (cube) => {
    if (!confirm(`Remove Section #${cube.section_number} from inventory? This cannot be undone.`)) return
    setRemovingId(cube.id)
    await api.removeCube(cube.id)
    setCubes(prev => prev.map(c => c.id === cube.id ? { ...c, status: 'removed' } : c))
    setRemovingId(null)
    onCubeRemoved?.()
  }

  let moldLabel = null
  let moldId = null
  if (test.mold_shape) {
    const code = { 'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS', 'Cylinder': 'CY', 'Other': 'OT' }[test.mold_shape] ?? 'OT'
    const moldRecord = molds?.find(m => m.id === test.mold_id)
    if (moldRecord) {
      moldId = `${code}${String(Math.round(moldRecord.volume_fl_oz)).padStart(2,'0')}${String(moldRecord.sections).padStart(2,'0')}${String(moldRecord.mold_number).padStart(2,'0')}`
    }
    moldLabel = `${test.mold_shape} ${test.mold_volume} fl. oz`
  }

  const frozen  = cubes ? cubes.filter(c => c.status === 'frozen').length  : null
  const removed = cubes ? cubes.filter(c => c.status === 'removed').length : null
  const tasted  = cubes ? cubes.filter(c => c.status === 'tasted').length  : null
  const uniqueExpressions = cubes ? [...new Set(cubes.map(c => c.expression || c.sku).filter(Boolean))] : []
  const hasMultipleBatches = uniqueExpressions.length > 1

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          {hasMultipleBatches
            ? uniqueExpressions.map(expr => {
                const color = recipeColor(expr)
                return <span key={expr} style={{ fontWeight: 700, fontSize: 13, padding: '1px 9px', borderRadius: 100, background: color?.bg, color: color?.text, border: `1px solid ${color?.border}` }}>{expr}</span>
              })
            : <span style={{ fontWeight: 700 }}>{test.expression || test.sku}</span>
          }
          {!hasMultipleBatches && <span className="text-sm text-muted">{test.sku}</span>}
          {!hasMultipleBatches && <span className="text-sm text-muted">Batch: {test.batch_label || test.batch_id?.slice(0, 8)}</span>}
          {moldId && <span className="text-sm" style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{moldId}</span>}
          {!moldId && moldLabel && <span className="text-sm text-muted">{moldLabel}</span>}
          {test.date && <span className="text-sm text-muted">{test.date}</span>}
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(test)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(test.id)}>Delete</button>
        </div>
      </div>
      <div className="card-body">
        <div className="targets">
          {test.freezer_location && <div className="target-item"><span className="target-label">Location</span><span className="target-value">{test.freezer_location}</span></div>}
          {test.freezer_temp != null && <div className="target-item"><span className="target-label">Freezer In Temp</span><span className="target-value">{test.freezer_temp}F</span></div>}
          {test.freezer_out_temp != null && <div className="target-item"><span className="target-label">Freezer Out Temp</span><span className="target-value">{test.freezer_out_temp}F</span></div>}
          {test.volume_fl_oz != null && <div className="target-item"><span className="target-label">fl. ozs.</span><span className="target-value">{test.volume_fl_oz}</span></div>}
          {test.hardness != null && <div className="target-item"><span className="target-label">Hardness</span><span className="target-value">{test.hardness}/5</span></div>}
          {test.freeze_time != null && <div className="target-item"><span className="target-label">Freeze Time</span><span className="target-value">{test.freeze_time >= 60 ? `${Math.floor(test.freeze_time / 60)}h ${test.freeze_time % 60}m` : `${test.freeze_time}m`}</span></div>}
          {(test.freezer_in_time || test.freezer_out_time) && (
            <div className="target-item">
              <span className="target-label">In to Out</span>
              <span className="target-value text-sm">{test.freezer_in_time ? new Date(test.freezer_in_time).toLocaleString() : '?'}{' to '}{test.freezer_out_time ? new Date(test.freezer_out_time).toLocaleString() : '?'}</span>
            </div>
          )}
        </div>
        {test.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{test.notes}</p>}
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
                const isFrozen = c.status === 'frozen'
                const isTasted = c.status === 'tasted'
                const isRemoved = c.status === 'removed'
                const cubeColor = isFrozen ? recipeColor(c.expression || c.sku) : null
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, fontSize: 11, background: cubeColor ? cubeColor.bg : isTasted ? '#d1fae5' : '#f3f4f6', color: cubeColor ? cubeColor.text : isTasted ? 'var(--green)' : 'var(--text-tertiary)', opacity: isRemoved ? 0.6 : 1 }}>
                    <span>#{c.section_number}</span>
                    {hasMultipleBatches && isFrozen && c.expression && <span style={{ fontSize: 9, opacity: 0.85 }}>{c.expression.split(' ').slice(0, 2).join(' ')}</span>}
                    <span style={{ fontSize: 10 }}>{isTasted ? 'done' : isRemoved ? 'gone' : ''}</span>
                    {isFrozen && (
                      <button type="button" title="Remove from inventory" disabled={removingId === c.id} onClick={() => handleRemoveCube(c)} style={{ marginLeft: 2, border: 'none', background: 'none', cursor: 'pointer', color: cubeColor ? cubeColor.text : 'var(--blue)', fontWeight: 700, fontSize: 12, lineHeight: 1, padding: '0 1px', opacity: removingId === c.id ? 0.4 : 0.6 }}>x</button>
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
  const [inventoryGroups, setInventoryGroups] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([
    api.getFreezeTests(), api.getBatches(), api.getMolds(), api.getFreezerInventory(),
  ]).then(([t, b, m, inv]) => { setTests(t); setBatches(b); setMolds(m); setInventoryGroups(inv) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) { await api.updateFreezeTest(editing.id, payload); setEditing(null) }
    else { await api.createFreezeTest(payload); setShowForm(false) }
    load()
  }

  const handleEdit = (test) => { setEditing(test); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleDelete = async (id) => { if (!confirm('Delete this freeze log?')) return; await api.deleteFreezeTest(id); load() }

  return (
    <div>
      <SectionHeader
        title="Freeze Log"
        action={
          <button className={`form-toggle-btn${showForm ? ' open' : ''}`} onClick={() => setShowForm(s => !s)}>
            {showForm ? 'x Cancel' : '+ New Freeze Log'}
          </button>
        }
      />
      <FreezerInventory groups={inventoryGroups} />
      {showForm && <FreezeForm batches={batches} molds={molds} onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {editing && <FreezeForm batches={batches} molds={molds} initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
      {loading
        ? <div className="empty-state"><p>Loading...</p></div>
        : tests.length === 0
          ? <div className="empty-state"><p>Nothing in the freeze log yet.</p></div>
          : <div className="card-list">{tests.map(t => <FreezeCard key={t.id} test={t} molds={molds} onEdit={handleEdit} onDelete={handleDelete} onCubeRemoved={load} />)}</div>
      }
    </div>
  )
}
