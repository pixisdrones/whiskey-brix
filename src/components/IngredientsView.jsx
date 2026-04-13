import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const UNITS = ['ml', 'oz', 'g', 'kg', 'lb', 'tsp', 'tbsp', 'cup', 'unit', 'liter']

function CatalogForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { name: '', unit: 'ml', cost_per_unit: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      cost_per_unit: form.cost_per_unit === '' ? null : Number(form.cost_per_unit),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Ingredient' : 'Add Ingredient'}</h3>

      <div className="form-row three-col">
        <Field label="Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Fresh lemon juice" />
        </Field>
        <Field label="Unit *">
          <select value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Cost per Unit ($)">
          <input type="number" step="0.01" min="0" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} placeholder="0.05" />
        </Field>
      </div>

      <Field label="Notes">
        <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Supplier, grade, etc." />
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
                  <td>
                    {item.cost_per_unit != null
                      ? <span style={{ fontWeight: 600 }}>${item.cost_per_unit.toFixed(4)}</span>
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
