import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const UNITS = ['ml', 'oz', 'g', 'kg', 'lb', 'tsp', 'tbsp', 'cup', 'unit', 'liter']

function CatalogForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    name: '', unit: 'ml', vendor: '', qty_purchased: '', purchase_price: '', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calculate cost per unit preview
  const costPerUnit = form.purchase_price !== '' && form.qty_purchased !== '' && Number(form.qty_purchased) > 0
    ? (Number(form.purchase_price) / Number(form.qty_purchased))
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      qty_purchased: form.qty_purchased === '' ? null : Number(form.qty_purchased),
      purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Ingredient' : 'Add Ingredient'}</h3>

      <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
        <Field label="Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Fresh lemon juice" />
        </Field>
        <Field label="Unit *">
          <select value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Vendor">
          <input value={form.vendor ?? ''} onChange={e => set('vendor', e.target.value)} placeholder="Supplier name" />
        </Field>
      </div>

      <div className="form-row three-col">
        <Field label="Qty Purchased">
          <input type="number" step="0.01" min="0" value={form.qty_purchased} onChange={e => set('qty_purchased', e.target.value)} placeholder="1000" />
        </Field>
        <Field label="Purchase Price ($)">
          <input type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="4.99" />
        </Field>
        <Field label="Cost per Unit (auto)">
          <div style={{ padding: '8px 0', fontSize: 14, fontWeight: 700, color: costPerUnit != null ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {costPerUnit != null ? `$${costPerUnit.toFixed(6)}` : '—'}
          </div>
        </Field>
      </div>

      <Field label="Notes">
        <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Grade, brand, notes…" />
      </Field>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add ingredient'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function IngredientsView() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.getCatalog().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateCatalogItem(editing.id, payload)
    } else {
      await api.createCatalogItem(payload)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleEdit = (item) => {
    setEditing(item)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this ingredient from the catalog?')) return
    await api.deleteCatalogItem(id)
    load()
  }

  const handleCancel = () => { setShowForm(false); setEditing(null) }

  return (
    <div>
      <SectionHeader
        title="Ingredients Catalog"
        action={
          <button
            className={`form-toggle-btn${showForm ? ' open' : ''}`}
            onClick={() => { setShowForm(s => !s); if (editing) setEditing(null) }}
          >
            {showForm && !editing ? '✕ Cancel' : '+ Add Ingredient'}
          </button>
        }
      />

      {showForm && (
        <CatalogForm initial={editing} onSave={handleSave} onCancel={handleCancel} />
      )}

      {loading ? (
        <div className="empty-state"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No ingredients in the catalog yet.</p>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>Add ingredients here to use them in recipes and track costs.</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Vendor</th>
                <th>Qty Purchased</th>
                <th>Purchase Price</th>
                <th>Cost / Unit</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.unit}</td>
                  <td className="text-muted text-sm">{item.vendor ?? '—'}</td>
                  <td className="text-muted text-sm">{item.qty_purchased ?? '—'}</td>
                  <td className="text-muted text-sm">{item.purchase_price != null ? `$${Number(item.purchase_price).toFixed(2)}` : '—'}</td>
                  <td>
                    {item.cost_per_unit != null
                      ? <span style={{ fontWeight: 600 }}>${Number(item.cost_per_unit).toFixed(6)}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-muted text-sm">{item.notes ?? '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
