import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'
import { recipeColor } from '../utils/recipeColors.js'

const CAP_TYPES     = ['Dropper', 'Cork', 'Screw Cap', 'Crown', 'Wax Dip', 'Other']
const BOTTLE_COLORS = ['Clear', 'Amber', 'Cobalt', 'Green', 'Black', 'Other']
const CONTAINER_TYPES = ['Mason Jar', 'Carboy', 'Growler', 'Bag-in-Box', 'Other']
const CAP_COLORS    = ['Black', 'White', 'Gold', 'Silver', 'Natural', 'Clear', 'Other']
const CAP_MATERIALS = ['Plastic', 'Metal', 'Cork', 'Rubber', 'Silicone', 'Other']

const STATUS_META = {
  in_stock: { label: 'In Stock', bg: 'var(--blue-light)',  color: 'var(--blue)',  border: 'var(--blue)'  },
  sold:     { label: 'Sold',     bg: 'var(--green-light)', color: 'var(--green)', border: 'var(--green)' },
  gifted:   { label: 'Gifted',   bg: 'hsl(272,55%,92%)',  color: 'hsl(272,48%,40%)', border: 'hsl(272,48%,65%)' },
  consumed: { label: 'Consumed', bg: 'var(--amber-light)', color: 'var(--amber)', border: 'var(--amber)' },
  damaged:  { label: 'Damaged',  bg: 'var(--red-light)',   color: 'var(--red)',   border: 'var(--red)'   },
}

const VOL_STATUS_META = {
  stored:    { label: 'Stored',    color: 'var(--blue)'  },
  bottled:   { label: 'Bottled',   color: 'var(--green)' },
  consumed:  { label: 'Consumed',  color: 'var(--amber)' },
  discarded: { label: 'Discarded', color: 'var(--text-tertiary)' },
}

function BottleChip({ bottle, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[bottle.status] ?? STATUS_META.in_stock
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setOpen(o => !o)}
        title={`#${bottle.bottle_number} · ${meta.label}${bottle.lot_number ? ' · ' + bottle.lot_number : ''}`}
        style={{
          padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', userSelect: 'none',
          background: meta.bg, color: meta.color,
          border: `1px solid ${meta.border}`,
        }}
      >
        #{bottle.bottle_number}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
          <div style={{
            position: 'absolute', zIndex: 10, top: '100%', left: 0, marginTop: 4,
            background: 'var(--bg-panel)', border: 'var(--border)', borderRadius: 'var(--radius-sm)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 120, overflow: 'hidden',
          }}>
            {Object.entries(STATUS_META).map(([val, m]) => (
              <button key={val}
                onClick={() => { onStatusChange(bottle.id, val); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 12px', fontSize: 12,
                  fontWeight: val === bottle.status ? 700 : 400,
                  background: val === bottle.status ? 'var(--bg)' : 'none',
                  border: 'none', cursor: 'pointer', color: m.color,
                }}
              >{m.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BottleTypeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    name:       initial.name       ?? '',
    size_oz:    initial.size_oz    ?? '',
    cap_type:   initial.cap_type   ?? 'Dropper',
    color:      initial.color      ?? 'Clear',
    supplier:   initial.supplier   ?? '',
    notes:      initial.notes      ?? '',
  } : { name: '', size_oz: '', cap_type: 'Dropper', color: 'Clear', supplier: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({ ...form, size_oz: Number(form.size_oz) })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Bottle Type' : 'Add Bottle Type'}</h3>
      <div className="form-row three-col">
        <Field label="Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Woozy 1 oz Clear" />
        </Field>
        <Field label="Size (fl. oz) *">
          <input required type="number" step="0.25" min="0.25" value={form.size_oz} onChange={e => set('size_oz', e.target.value)} placeholder="1.0" />
        </Field>
        <Field label="Cap Type">
          <select value={form.cap_type} onChange={e => set('cap_type', e.target.value)}>
            {CAP_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-row two-col">
        <Field label="Color">
          <select value={form.color} onChange={e => set('color', e.target.value)}>
            {BOTTLE_COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="SKS Bottle, Berlin Packaging..." />
        </Field>
      </div>
      <Field label="Notes">
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Link, order number, observations..." />
      </Field>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add bottle type'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function ReceiveForm({ bottleType, onSave, onCancel }) {
  const [form, setForm] = useState({ qty: '', date: new Date().toISOString().slice(0, 10), cost_per_unit: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      bottle_type_id: bottleType.id,
      qty:            Number(form.qty),
      date:           form.date,
      cost_per_unit:  form.cost_per_unit === '' ? null : Number(form.cost_per_unit),
      notes:          form.notes || null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 4 }}>Receive Empty Bottles</h3>
      <p className="text-sm text-muted" style={{ marginBottom: 16 }}>{bottleType.name} · {bottleType.size_oz} fl. oz · {bottleType.cap_type}</p>
      <div className="form-row three-col">
        <Field label="Qty Received *">
          <input required type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="100" />
        </Field>
        <Field label="Date Received">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Cost per Bottle ($)">
          <input type="number" step="0.01" min="0" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} placeholder="0.45" />
        </Field>
      </div>
      <Field label="Notes">
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Order #, supplier..." />
      </Field>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">Add to stock</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function FillForm({ batches, bottleTypes, onSave, onCancel }) {
  const [form, setForm] = useState({
    batch_id: '', bottle_type_id: '', qty: '',
    date_filled: new Date().toISOString().slice(0, 10),
    lot_number: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedBatch = batches.find(b => b.id === form.batch_id)
  const selectedType  = bottleTypes.find(t => t.id === form.bottle_type_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({ ...form, qty: Number(form.qty) })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>Fill from Batch</h3>
      <div className="form-row two-col">
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => {
            const b = batches.find(b => b.id === e.target.value)
            set('batch_id', e.target.value)
            if (b?.batch_id && !form.lot_number) set('lot_number', b.batch_id)
          }}>
            <option value="">-- select batch --</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} - {b.expression || b.sku}</option>
            ))}
          </select>
        </Field>
        <Field label="Bottle Type *">
          <select required value={form.bottle_type_id} onChange={e => set('bottle_type_id', e.target.value)}>
            <option value="">-- select bottle type --</option>
            {bottleTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name} · {t.size_oz} oz · {t.cap_type}</option>
            ))}
          </select>
        </Field>
      </div>
      {selectedBatch && (
        <div style={{ background: 'var(--accent-light)', border: '0.5px solid #c6d9b0', borderRadius: 'var(--radius-sm)', padding: '8px 14px', marginBottom: 12, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedBatch.expression || selectedBatch.sku}</span>
          {selectedBatch.date && <span className="text-muted" style={{ marginLeft: 8 }}>{selectedBatch.date}</span>}
          {selectedBatch.observed_brix != null && <span className="text-muted" style={{ marginLeft: 8 }}>{selectedBatch.observed_brix} Bx</span>}
          {selectedType?.qty_empty != null && (
            <span style={{ marginLeft: 8, color: selectedType.qty_empty > 0 ? 'var(--text-secondary)' : 'var(--red)' }}>
              · {selectedType.qty_empty} empty {selectedType.name} available
            </span>
          )}
        </div>
      )}
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Qty Bottles *">
          <input required type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="24" />
        </Field>
        <Field label="Date Filled">
          <input type="date" value={form.date_filled} onChange={e => set('date_filled', e.target.value)} />
        </Field>
        <Field label="Lot Number">
          <input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} placeholder={selectedBatch?.batch_id ?? 'auto'} />
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations..." />
        </Field>
      </div>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">Fill bottles</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function VolumeStorageForm({ batches, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    batch_id: initial.batch_id ?? '', volume_fl_oz: initial.volume_fl_oz ?? '',
    container_type: initial.container_type ?? 'Mason Jar', container_label: initial.container_label ?? '',
    storage_location: initial.storage_location ?? '', date: initial.date ?? new Date().toISOString().slice(0, 10),
    status: initial.status ?? 'stored', notes: initial.notes ?? '',
  } : {
    batch_id: '', volume_fl_oz: '', container_type: 'Mason Jar',
    container_label: '', storage_location: '', date: new Date().toISOString().slice(0, 10),
    status: 'stored', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedBatch = batches.find(b => b.id === form.batch_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const b = selectedBatch ?? {}
    await onSave({ ...form, sku: b.sku ?? null, expression: b.expression ?? null, batch_label: b.batch_id ?? null, volume_fl_oz: Number(form.volume_fl_oz) })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Volume Storage' : 'Log Volume Storage'}</h3>
      <div className="form-row three-col">
        <Field label="Batch *">
          <select required value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
            <option value="">-- select batch --</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_id || b.id.slice(0, 8)} - {b.expression || b.sku}</option>)}
          </select>
        </Field>
        <Field label="Volume (fl. oz) *">
          <input required type="number" step="0.5" min="0.5" value={form.volume_fl_oz} onChange={e => set('volume_fl_oz', e.target.value)} placeholder="32" />
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Container Type">
          <select value={form.container_type} onChange={e => set('container_type', e.target.value)}>
            {CONTAINER_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Container Label">
          <input value={form.container_label} onChange={e => set('container_label', e.target.value)} placeholder="Jar A, Growler 1..." />
        </Field>
        <Field label="Storage Location">
          <input value={form.storage_location} onChange={e => set('storage_location', e.target.value)} placeholder="Fridge, shelf..." />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(VOL_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations..." />
      </Field>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Log storage'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function BottledInventoryPanel({ bottles, bottleTypes, onStatusChange }) {
  const inStock = bottles.filter(b => b.status === 'in_stock')
  if (inStock.length === 0) return null
  const typeMap = Object.fromEntries(bottleTypes.map(t => [t.id, t]))
  const byExpression = {}
  inStock.forEach(b => {
    const key = b.expression || b.sku || 'Unknown'
    if (!byExpression[key]) byExpression[key] = []
    byExpression[key].push(b)
  })
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2>Currently Bottled</h2>
        <span className="text-muted text-sm">{inStock.length} bottle{inStock.length !== 1 ? 's' : ''} in stock</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {Object.entries(byExpression).map(([expression, group]) => {
          const color = recipeColor(expression)
          const byLot = {}
          group.forEach(b => {
            const lotKey = b.lot_number || b.batch_label || '--'
            if (!byLot[lotKey]) byLot[lotKey] = []
            byLot[lotKey].push(b)
          })
          return (
            <div key={expression} style={{ border: 'var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: color?.text ?? 'var(--text)' }}>
                {expression}
              </div>
              {Object.entries(byLot).map(([lot, lotBottles]) => {
                const type = typeMap[lotBottles[0]?.bottle_type_id]
                return (
                  <div key={lot} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5 }}>
                      {lot}
                      {type && <span style={{ marginLeft: 6 }}>{type.size_oz} oz · {type.cap_type}</span>}
                      {lotBottles[0]?.date_filled && <span style={{ marginLeft: 6 }}>{lotBottles[0].date_filled}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {lotBottles.map(b => <BottleChip key={b.id} bottle={b} onStatusChange={onStatusChange} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VolumeStorageCard({ record, onEdit, onDelete, onStatusChange }) {
  const color = recipeColor(record.expression)
  const volMeta = VOL_STATUS_META[record.status] ?? VOL_STATUS_META.stored
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: color?.text ?? 'var(--text)' }}>
            {record.expression || record.sku || record.batch_label || '--'}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13, color: volMeta.color }}>{volMeta.label}</span>
          {record.container_label && <span className="text-sm text-muted">{record.container_label}</span>}
          {record.container_type && <span className="text-sm text-muted">{record.container_type}</span>}
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(record)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(record.id)}>Delete</button>
        </div>
      </div>
      <div className="card-body">
        <div className="targets">
          {record.volume_fl_oz != null && <div className="target-item"><span className="target-label">Volume</span><span className="target-value">{record.volume_fl_oz} fl. oz</span></div>}
          {record.batch_label && <div className="target-item"><span className="target-label">Batch</span><span className="target-value">{record.batch_label}</span></div>}
          {record.date && <div className="target-item"><span className="target-label">Date</span><span className="target-value">{record.date}</span></div>}
          {record.storage_location && <div className="target-item"><span className="target-label">Location</span><span className="target-value">{record.storage_location}</span></div>}
        </div>
        {record.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{record.notes}</p>}
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          {Object.entries(VOL_STATUS_META).map(([val, m]) => (
            <button key={val} onClick={() => onStatusChange(record.id, { status: val })} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: `1px solid ${val === record.status ? m.color : 'var(--border-color)'}`, background: val === record.status ? 'var(--bg)' : 'none', color: val === record.status ? m.color : 'var(--text-tertiary)', cursor: 'pointer' }}>{m.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CapTypeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    name: initial.name ?? '', cap_type: initial.cap_type ?? 'Dropper',
    size_mm: initial.size_mm ?? '', color: initial.color ?? 'Black',
    material: initial.material ?? 'Plastic', supplier: initial.supplier ?? '', notes: initial.notes ?? '',
  } : { name: '', cap_type: 'Dropper', size_mm: '', color: 'Black', material: 'Plastic', supplier: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({ ...form, size_mm: form.size_mm !== '' ? Number(form.size_mm) : null })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Cap Type' : 'Add Cap Type'}</h3>
      <div className="form-row three-col">
        <Field label="Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="18mm Black Dropper Cap" />
        </Field>
        <Field label="Cap Type">
          <select value={form.cap_type} onChange={e => set('cap_type', e.target.value)}>
            {CAP_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Size (mm)">
          <input type="number" step="1" min="1" value={form.size_mm} onChange={e => set('size_mm', e.target.value)} placeholder="18" />
        </Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Color">
          <select value={form.color} onChange={e => set('color', e.target.value)}>
            {CAP_COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Material">
          <select value={form.material} onChange={e => set('material', e.target.value)}>
            {CAP_MATERIALS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="SKS Bottle..." />
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Order #, link..." />
        </Field>
      </div>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add cap type'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function ReceiveCapForm({ capType, onSave, onCancel }) {
  const [form, setForm] = useState({ qty: '', date: new Date().toISOString().slice(0, 10), cost_per_unit: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const totalCost = form.qty && form.cost_per_unit ? (Number(form.qty) * Number(form.cost_per_unit)).toFixed(2) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      cap_type_id:   capType.id,
      qty:           Number(form.qty),
      date:          form.date,
      cost_per_unit: form.cost_per_unit !== '' ? Number(form.cost_per_unit) : null,
      notes:         form.notes || null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 4 }}>Receive Caps</h3>
      <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
        {capType.name}{capType.size_mm ? ` · ${capType.size_mm}mm` : ''}{capType.color ? ` · ${capType.color}` : ''}{capType.material ? ` · ${capType.material}` : ''}
      </p>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Qty Received *">
          <input required type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="100" />
        </Field>
        <Field label="Date Received">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Cost per Cap ($)">
          <input type="number" step="0.001" min="0" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} placeholder="0.12" />
        </Field>
        <Field label="Total Cost">
          <input readOnly value={totalCost != null ? `$${totalCost}` : ''} style={{ color: 'var(--text-secondary)', background: 'var(--bg)' }} placeholder="auto" />
        </Field>
      </div>
      <Field label="Notes">
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Order #, supplier..." />
      </Field>
      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">Add to stock</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function CapsSection({ capStock, onEdit, onDelete, onReceive, onAddCap }) {
  const [open, setOpen] = useState(false)
  const totalReceived = capStock.reduce((s, t) => s + t.qty_received, 0)
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2 style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          Cap Types & Stock {open ? 'v' : '>'}
        </h2>
        <button className="btn btn-sm btn-primary" onClick={onAddCap}>+ Add Cap Type</button>
      </div>
      {open && (
        <div style={{ padding: '12px 20px' }}>
          {capStock.length === 0 ? (
            <p className="text-sm text-muted">No cap types registered. Add one to start tracking cap inventory.</p>
          ) : (
            <>
              {totalReceived > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {capStock.filter(t => t.qty_received > 0).map(t => (
                    <div key={t.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: 4 }}>{t.qty_received}</span>
                      {t.name}
                      {t.total_cost > 0 && <span className="text-muted" style={{ marginLeft: 4 }}>(${t.total_cost.toFixed(2)} total)</span>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Type</th><th>Size</th><th>Color</th><th>Material</th>
                      <th>Supplier</th><th>Qty Received</th><th>Total Spent</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {capStock.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td>{t.cap_type || '—'}</td>
                        <td>{t.size_mm ? `${t.size_mm}mm` : '—'}</td>
                        <td>{t.color || '—'}</td>
                        <td>{t.material || '—'}</td>
                        <td>{t.supplier || '—'}</td>
                        <td><span style={{ fontWeight: 700, color: t.qty_received > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>{t.qty_received}</span></td>
                        <td>{t.total_cost > 0 ? `$${t.total_cost.toFixed(2)}` : '—'}</td>
                        <td>
                          <div className="flex gap-6">
                            <button className="btn btn-sm" onClick={() => onReceive(t)}>+ Receive</button>
                            <button className="btn btn-sm" onClick={() => onEdit(t)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => onDelete(t.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BottleTypesSection({ stock, onEdit, onDelete, onReceive, onAddType }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2 style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>Bottle Types & Empty Stock {open ? 'v' : '>'}</h2>
        <button className="btn btn-sm btn-primary" onClick={onAddType}>+ Add Type</button>
      </div>
      {open && (
        <div style={{ padding: '12px 20px' }}>
          {stock.length === 0 ? (
            <p className="text-sm text-muted">No bottle types registered. Add one to start tracking empty stock.</p>
          ) : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Size</th><th>Cap</th><th>Color</th><th>Received</th><th>Filled</th><th style={{ color: 'var(--accent)' }}>Empty</th><th></th></tr></thead>
              <tbody>
                {stock.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.size_oz} fl. oz</td>
                    <td>{t.cap_type}</td>
                    <td>{t.color || '--'}</td>
                    <td>{t.qty_received}</td>
                    <td>{t.qty_filled}</td>
                    <td><span style={{ fontWeight: 700, color: t.qty_empty > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>{t.qty_empty}</span></td>
                    <td><div className="flex gap-6"><button className="btn btn-sm" onClick={() => onReceive(t)}>+ Receive</button><button className="btn btn-sm" onClick={() => onEdit(t)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => onDelete(t.id)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function BottlesHistory({ bottles, bottleTypes, onStatusChange }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const typeMap = Object.fromEntries(bottleTypes.map(t => [t.id, t]))
  const filtered = statusFilter === 'all' ? bottles : bottles.filter(b => b.status === statusFilter)
  const groups = {}
  filtered.forEach(b => {
    const key = `${b.expression || b.sku || '?'}__${b.lot_number || b.batch_label || '--'}`
    if (!groups[key]) groups[key] = { expression: b.expression || b.sku || '?', lot: b.lot_number || b.batch_label || '--', date_filled: b.date_filled, type: typeMap[b.bottle_type_id], bottles: [] }
    groups[key].bottles.push(b)
  })
  const counts = Object.fromEntries(Object.keys(STATUS_META).map(s => [s, bottles.filter(b => b.status === s).length]))
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2 style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>All Filled Bottles {open ? 'v' : '>'}</h2>
        <span className="text-muted text-sm">{bottles.length} total</span>
      </div>
      {open && (
        <div style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => setStatusFilter('all')} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: `1px solid ${statusFilter === 'all' ? 'var(--accent)' : 'var(--border-color)'}`, background: statusFilter === 'all' ? 'var(--accent-light)' : 'none', color: statusFilter === 'all' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>All ({bottles.length})</button>
            {Object.entries(STATUS_META).map(([val, m]) => (
              <button key={val} onClick={() => setStatusFilter(val)} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: `1px solid ${statusFilter === val ? m.border : 'var(--border-color)'}`, background: statusFilter === val ? m.bg : 'none', color: statusFilter === val ? m.color : 'var(--text-secondary)', cursor: 'pointer' }}>{m.label} ({counts[val] ?? 0})</button>
            ))}
          </div>
          {Object.keys(groups).length === 0 ? (
            <p className="text-sm text-muted">No bottles match this filter.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.values(groups).map((g, i) => {
                const color = recipeColor(g.expression)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: color?.text ?? 'var(--text)' }}>{g.expression}</span>
                      <span className="text-sm text-muted">{g.lot}</span>
                      {g.type && <span className="text-sm text-muted">{g.type.size_oz} oz · {g.type.cap_type}</span>}
                      {g.date_filled && <span className="text-sm text-muted">{g.date_filled}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.bottles.map(b => <BottleChip key={b.id} bottle={b} onStatusChange={onStatusChange} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BottlesView() {
  const [batches, setBatches] = useState([])
  const [bottleStock, setBottleStock] = useState([])
  const [bottles, setBottles] = useState([])
  const [volumeStorage, setVolumeStorage] = useState([])
  const [capStock, setCapStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFill, setShowFill] = useState(false)
  const [showVolForm, setShowVolForm] = useState(false)
  const [editingVol, setEditingVol] = useState(null)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [receivingType, setReceivingType] = useState(null)
  const [showCapTypeForm, setShowCapTypeForm] = useState(false)
  const [editingCapType, setEditingCapType] = useState(null)
  const [receivingCapType, setReceivingCapType] = useState(null)

  const load = () => Promise.all([
    api.getBatches(), api.getBottleStock(), api.getFilledBottles(), api.getVolumeStorage(), api.getCapStock(),
  ]).then(([b, bs, fl, vs, cs]) => { setBatches(b); setBottleStock(bs); setBottles(fl); setVolumeStorage(vs); setCapStock(cs) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleFill = async (payload) => { await api.fillBottles(payload); setShowFill(false); load() }

  const handleStatusChange = async (id, status) => {
    setBottles(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    await api.updateBottleStatus(id, status)
  }

  const handleVolSave = async (payload) => {
    if (editingVol) { await api.updateVolumeStorage(editingVol.id, payload); setEditingVol(null) }
    else { await api.createVolumeStorage(payload); setShowVolForm(false) }
    load()
  }

  const handleVolDelete = async (id) => {
    if (!confirm('Delete this volume storage record?')) return
    await api.deleteVolumeStorage(id); load()
  }

  const handleVolStatusChange = async (id, data) => {
    setVolumeStorage(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    await api.updateVolumeStorage(id, data)
  }

  const handleTypeSave = async (payload) => {
    if (editingType) { await api.updateBottleType(editingType.id, payload); setEditingType(null) }
    else { await api.createBottleType(payload); setShowTypeForm(false) }
    load()
  }

  const handleTypeDelete = async (id) => {
    if (!confirm('Delete this bottle type? Filled bottle records will not be affected.')) return
    await api.deleteBottleType(id); load()
  }

  const handleReceive = async (payload) => { await api.receiveBottles(payload); setReceivingType(null); load() }

  const handleCapTypeSave = async (payload) => {
    if (editingCapType) { await api.updateCapType(editingCapType.id, payload); setEditingCapType(null) }
    else { await api.createCapType(payload); setShowCapTypeForm(false) }
    load()
  }

  const handleCapTypeDelete = async (id) => {
    if (!confirm('Delete this cap type? Purchase records will not be affected.')) return
    await api.deleteCapType(id); load()
  }

  const handleReceiveCap = async (payload) => { await api.receiveCaps(payload); setReceivingCapType(null); load() }

  const closeAllForms = () => {
    setShowFill(false); setShowVolForm(false); setEditingVol(null)
    setShowTypeForm(false); setEditingType(null); setReceivingType(null)
    setShowCapTypeForm(false); setEditingCapType(null); setReceivingCapType(null)
  }

  const bottleTypes = bottleStock

  return (
    <div>
      <SectionHeader
        title="Bottles"
        action={
          <div className="flex gap-8">
            <button className={`form-toggle-btn${showFill ? ' open' : ''}`} onClick={() => { closeAllForms(); if (!showFill) setShowFill(true) }}>
              {showFill ? 'x Cancel' : '+ Fill from Batch'}
            </button>
            <button className={`form-toggle-btn${(showVolForm && !editingVol) ? ' open' : ''}`} onClick={() => { closeAllForms(); if (!showVolForm) setShowVolForm(true) }}>
              {showVolForm && !editingVol ? 'x Cancel' : '+ Log Volume Storage'}
            </button>
          </div>
        }
      />
      {showFill && <FillForm batches={batches} bottleTypes={bottleTypes} onSave={handleFill} onCancel={() => setShowFill(false)} />}
      {(showTypeForm || editingType) && <BottleTypeForm initial={editingType} onSave={handleTypeSave} onCancel={() => { setShowTypeForm(false); setEditingType(null) }} />}
      {receivingType && <ReceiveForm bottleType={receivingType} onSave={handleReceive} onCancel={() => setReceivingType(null)} />}
      {(showCapTypeForm || editingCapType) && <CapTypeForm initial={editingCapType} onSave={handleCapTypeSave} onCancel={() => { setShowCapTypeForm(false); setEditingCapType(null) }} />}
      {receivingCapType && <ReceiveCapForm capType={receivingCapType} onSave={handleReceiveCap} onCancel={() => setReceivingCapType(null)} />}
      {(showVolForm || editingVol) && <VolumeStorageForm batches={batches} initial={editingVol} onSave={handleVolSave} onCancel={() => { setShowVolForm(false); setEditingVol(null) }} />}
      {loading ? (
        <div className="empty-state"><p>Loading...</p></div>
      ) : (
        <>
          <BottledInventoryPanel bottles={bottles} bottleTypes={bottleTypes} onStatusChange={handleStatusChange} />
          <BottleTypesSection
            stock={bottleStock}
            onEdit={t => { closeAllForms(); setEditingType(t) }}
            onDelete={handleTypeDelete}
            onReceive={t => { closeAllForms(); setReceivingType(t) }}
            onAddType={() => { closeAllForms(); setShowTypeForm(true) }}
          />
          <CapsSection
            capStock={capStock}
            onEdit={t => { closeAllForms(); setEditingCapType(t) }}
            onDelete={handleCapTypeDelete}
            onReceive={t => { closeAllForms(); setReceivingCapType(t) }}
            onAddCap={() => { closeAllForms(); setShowCapTypeForm(true) }}
          />
          {volumeStorage.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 10 }}>Volume Storage</div>
              <div className="card-list">
                {volumeStorage.map(r => <VolumeStorageCard key={r.id} record={r} onEdit={rec => { closeAllForms(); setEditingVol(rec) }} onDelete={handleVolDelete} onStatusChange={handleVolStatusChange} />)}
              </div>
            </div>
          )}
          {bottles.length > 0 && <BottlesHistory bottles={bottles} bottleTypes={bottleTypes} onStatusChange={handleStatusChange} />}
          {bottles.length === 0 && volumeStorage.length === 0 && bottleStock.length === 0 && capStock.length === 0 && (
            <div className="empty-state">
              <p>No bottle records yet.</p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>Add a bottle type, then use "Fill from Batch" to start tracking inventory.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
