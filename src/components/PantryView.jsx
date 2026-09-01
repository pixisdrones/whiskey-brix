import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const UNITS = ['ml', 'L', 'oz', 'cups', 'g', 'kg', 'tsp', 'tbsp', 'unit', 'count', 'leaves', 'sprigs']

export const CAT = {
  fresh_juice: { label: 'Fresh Juice',   bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  syrup:       { label: 'Syrup',         bg: '#fdf4ff', border: '#d946ef', text: '#701a75' },
  spirit:      { label: 'Spirit/Mixer',  bg: '#eff6ff', border: '#60a5fa', text: '#1e3a8a' },
  dry:         { label: 'Dry/Pantry',    bg: '#fff7ed', border: '#fb923c', text: '#7c2d12' },
  other:       { label: 'Other',         bg: '#f8fafc', border: '#94a3b8', text: '#334155' },
}

const EMPTY_FORM = { name: '', category: 'other', quantity: '', unit: 'ml', low_threshold: '', expires_at: '', notes: '' }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / 86400000
  return Math.ceil(diff)
}

function CategoryBadge({ cat }) {
  const m = CAT[cat] ?? CAT.other
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: m.bg, border: `1px solid ${m.border}`, color: m.text, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

function PantryForm({ initial, onSave, onCancel, catalog = [] }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!initial?.id

  const handleNameChange = (value) => {
    set('name', value)
    const match = catalog.find(c => c.name.toLowerCase().trim() === value.toLowerCase().trim())
    if (match) set('unit', match.unit)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      name: form.name.trim(),
      category: form.category,
      quantity: form.quantity === '' ? 0 : Number(form.quantity),
      unit: form.unit,
      low_threshold: form.low_threshold === '' ? null : Number(form.low_threshold),
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <datalist id="pantry-ingredient-names">
        {catalog.map(c => <option key={c.id} value={c.name} />)}
      </datalist>
      <h3 style={{ marginBottom: 16 }}>{isEdit ? 'Edit Item' : 'Add Pantry Item'}</h3>
      <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
        <Field label="Name *">
          <input required list="pantry-ingredient-names" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Fresh lemon juice" />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {Object.entries(CAT).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="On Hand">
          <input type="number" step="0.1" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Unit">
          <select value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>
        <Field label="Low Stock Alert">
          <input type="number" step="0.1" min="0" value={form.low_threshold} onChange={e => set('low_threshold', e.target.value)} placeholder="e.g. 100" />
        </Field>
        <Field label="Expires">
          <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} />
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" className="btn btn-primary btn-sm">{isEdit ? 'Save Changes' : 'Add Item'}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function AdjustPanel({ item, onSave, onCancel }) {
  const [dir, setDir] = useState('add')
  const [amt, setAmt] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const delta = parseFloat(amt)
    if (!delta || isNaN(delta)) return
    setSaving(true)
    const newQty = Math.max(0, (item.quantity ?? 0) + (dir === 'add' ? delta : -delta))
    await onSave(newQty)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
        {['add', 'use'].map(d => (
          <button key={d} type="button" onClick={() => setDir(d)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: dir === d ? 700 : 400, background: dir === d ? 'var(--accent)' : 'var(--surface)', color: dir === d ? '#fff' : 'var(--text-secondary)', border: 'none', borderRight: d === 'add' ? '1px solid var(--border-color)' : 'none', cursor: 'pointer' }}>
            {d === 'add' ? '+ Add Stock' : '− Record Use'}
          </button>
        ))}
      </div>
      <input
        type="number" step="0.1" min="0"
        value={amt} onChange={e => setAmt(e.target.value)}
        placeholder="Amount"
        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'var(--border)', background: 'var(--surface)', width: 90 }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.unit}</span>
      {amt && !isNaN(parseFloat(amt)) && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          → {Math.max(0, (item.quantity ?? 0) + (dir === 'add' ? parseFloat(amt) : -parseFloat(amt))).toFixed(1)} {item.unit}
        </span>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !amt}>{saving ? 'Saving…' : 'Save'}</button>
      <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  )
}

export default function PantryView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustId, setAdjustId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [catalog, setCatalog] = useState([])

  const load = () => api.getPantry().then(setItems).finally(() => setLoading(false))
  useEffect(() => {
    load()
    api.getCatalog().then(setCatalog).catch(() => {})
  }, [])

  const handleAdd = async (data) => {
    await api.createPantryItem(data)
    setShowForm(false)
    load()
  }

  const handleEdit = async (data) => {
    await api.updatePantryItem(editItem.id, data)
    setEditItem(null)
    load()
  }

  const handleAdjust = async (id, newQty) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    await api.updatePantryItem(id, { ...item, quantity: newQty })
    setAdjustId(null)
    load()
  }

  const handleDelete = async (id) => {
    await api.deletePantryItem(id)
    setDeleteId(null)
    load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const visible = catFilter === 'all' ? items : items.filter(i => i.category === catFilter)

  const lowCount = items.filter(i => i.low_threshold != null && (i.quantity ?? 0) <= i.low_threshold).length
  const expiringCount = items.filter(i => { const d = daysUntil(i.expires_at); return d != null && d <= 3 }).length

  return (
    <div>
      <SectionHeader title="Pantry" action={
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setEditItem(null) }}>+ Add Item</button>
      } />

      {/* Summary chips */}
      {(lowCount > 0 || expiringCount > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {lowCount > 0 && (
            <div style={{ padding: '4px 12px', borderRadius: 100, background: '#fff7ed', border: '1px solid #fb923c', color: '#7c2d12', fontSize: 12, fontWeight: 600 }}>
              ⚠ {lowCount} item{lowCount !== 1 ? 's' : ''} low on stock
            </div>
          )}
          {expiringCount > 0 && (
            <div style={{ padding: '4px 12px', borderRadius: 100, background: '#fef2f2', border: '1px solid #fca5a5', color: '#7f1d1d', fontSize: 12, fontWeight: 600 }}>
              ⏰ {expiringCount} expiring within 3 days
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && !editItem && (
        <PantryForm onSave={handleAdd} onCancel={() => setShowForm(false)} catalog={catalog} />
      )}

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...Object.keys(CAT)].map(c => {
              const m = CAT[c]
              const active = catFilter === c
              const count = c === 'all' ? items.length : items.filter(i => i.category === c).length
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatFilter(c)}
                  style={{
                    fontSize: 11, fontWeight: active ? 700 : 500, padding: '3px 10px', borderRadius: 100, cursor: 'pointer',
                    background: active ? (m?.bg ?? 'var(--accent)') : 'var(--surface)',
                    border: `1px solid ${active ? (m?.border ?? 'var(--accent)') : 'var(--border-color)'}`,
                    color: active ? (m?.text ?? '#fff') : 'var(--text-secondary)',
                  }}
                >
                  {c === 'all' ? 'All' : m.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                </button>
              )
            })}
          </div>
          <span className="text-muted text-sm">{visible.length} item{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted" style={{ padding: '16px 20px' }}>Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted" style={{ padding: '16px 20px' }}>
            {items.length === 0 ? 'No pantry items yet. Add ingredients you have on hand.' : 'No items in this category.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(item => {
                  const isLow = item.low_threshold != null && (item.quantity ?? 0) <= item.low_threshold
                  const days = daysUntil(item.expires_at)
                  const isExpired = days != null && days <= 0
                  const isSoonExpiring = days != null && days > 0 && days <= 3
                  const isEditing = editItem?.id === item.id
                  const isAdjusting = adjustId === item.id

                  if (isEditing) {
                    return (
                      <tr key={item.id}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <PantryForm initial={item} onSave={handleEdit} onCancel={() => setEditItem(null)} catalog={catalog} />
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <>
                      <tr key={item.id} style={{ opacity: isExpired ? 0.5 : 1 }}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td><CategoryBadge cat={item.category} /></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isLow ? '#dc2626' : (item.quantity > 0 ? 'var(--accent)' : 'var(--text-tertiary)') }}>
                          {item.quantity ?? 0} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>{item.unit}</span>
                        </td>
                        <td>
                          {isLow && <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: 100 }}>Low</span>}
                        </td>
                        <td>
                          {isExpired && <span style={{ fontSize: 11, fontWeight: 600, color: '#7f1d1d', background: '#fef2f2', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: 100 }}>Expired</span>}
                          {isSoonExpiring && <span style={{ fontSize: 11, fontWeight: 600, color: '#7c2d12', background: '#fff7ed', border: '1px solid #fb923c', padding: '1px 6px', borderRadius: 100 }}>{days}d left</span>}
                          {!isExpired && !isSoonExpiring && item.expires_at && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.expires_at}</span>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn btn-sm" onClick={() => setAdjustId(isAdjusting ? null : item.id)} style={{ marginRight: 4 }}>
                            {isAdjusting ? 'Cancel' : 'Adjust'}
                          </button>
                          <button className="btn btn-sm" onClick={() => { setEditItem(item); setAdjustId(null) }} style={{ marginRight: 4 }}>Edit</button>
                          {deleteId === item.id ? (
                            <>
                              <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', marginRight: 4 }} onClick={() => handleDelete(item.id)}>Confirm</button>
                              <button className="btn btn-sm" onClick={() => setDeleteId(null)}>×</button>
                            </>
                          ) : (
                            <button className="btn btn-sm" onClick={() => setDeleteId(item.id)}>Delete</button>
                          )}
                        </td>
                      </tr>
                      {isAdjusting && (
                        <tr key={`${item.id}__adj`}>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <AdjustPanel item={item} onSave={(qty) => handleAdjust(item.id, qty)} onCancel={() => setAdjustId(null)} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
