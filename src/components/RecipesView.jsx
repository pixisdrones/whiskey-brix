import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Badge from './shared/Badge.jsx'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const EMPTY_RECIPE = {
  sku: '', expression: '', version: '1.0', status: 'active',
  spirit_pairing: '', brix_min: '', brix_max: '', ph_min: '', ph_max: '',
  melt_min: '', melt_max: '', mold_type: '', notes: '', parent_id: '',
  ingredients: [{ name: '', brand: '', amount: '', unit: 'ml' }]
}

function IngredientTable({ ingredients, onChange }) {
  const update = (idx, field, val) => {
    const next = ingredients.map((ing, i) => i === idx ? { ...ing, [field]: val } : ing)
    onChange(next)
  }
  const add = () => onChange([...ingredients, { name: '', brand: '', amount: '', unit: 'ml' }])
  const remove = (idx) => onChange(ingredients.filter((_, i) => i !== idx))

  return (
    <div style={{ marginTop: 4 }}>
      <table className="ing-table">
        <thead>
          <tr>
            <th style={{ width: '35%' }}>Name</th>
            <th style={{ width: '25%' }}>Brand</th>
            <th style={{ width: '15%' }}>Amount</th>
            <th style={{ width: '15%' }}>Unit</th>
            <th style={{ width: '10%' }}></th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, i) => (
            <tr key={i}>
              <td><input value={ing.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Ingredient name" /></td>
              <td><input value={ing.brand} onChange={e => update(i, 'brand', e.target.value)} placeholder="Brand (optional)" /></td>
              <td><input type="number" value={ing.amount} onChange={e => update(i, 'amount', e.target.value)} placeholder="0" /></td>
              <td>
                <select value={ing.unit} onChange={e => update(i, 'unit', e.target.value)}>
                  {['ml','oz','g','tsp','tbsp','cup','unit'].map(u => <option key={u}>{u}</option>)}
                </select>
              </td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => remove(i)} type="button">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-sm btn-ghost" onClick={add} type="button">+ Add ingredient</button>
    </div>
  )
}

function RecipeForm({ recipes, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    ...initial,
    ingredients: initial._ingredients ?? []
  } : EMPTY_RECIPE)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      brix_min: form.brix_min === '' ? null : Number(form.brix_min),
      brix_max: form.brix_max === '' ? null : Number(form.brix_max),
      ph_min: form.ph_min === '' ? null : Number(form.ph_min),
      ph_max: form.ph_max === '' ? null : Number(form.ph_max),
      melt_min: form.melt_min === '' ? null : Number(form.melt_min),
      melt_max: form.melt_max === '' ? null : Number(form.melt_max),
      parent_id: form.parent_id || null,
      ingredients: form.ingredients.filter(i => i.name.trim()),
    }
    await onSave(payload)
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Recipe' : 'New Recipe'}</h3>

      <div className="form-row three-col">
        <Field label="SKU *">
          <input required value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="BLM-HL-001" />
        </Field>
        <Field label="Expression">
          <input value={form.expression} onChange={e => set('expression', e.target.value)} placeholder="Honey Lemon" />
        </Field>
        <Field label="Version">
          <input value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
        </Field>
      </div>

      <div className="form-row three-col">
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="experimental">Experimental</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Spirit Pairing">
          <input value={form.spirit_pairing} onChange={e => set('spirit_pairing', e.target.value)} placeholder="Bourbon/Whiskey" />
        </Field>
        <Field label="Mold Type">
          <input value={form.mold_type} onChange={e => set('mold_type', e.target.value)} placeholder="Large cube" />
        </Field>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr' }}>
        <Field label="Brix Min">
          <input type="number" step="0.1" value={form.brix_min} onChange={e => set('brix_min', e.target.value)} placeholder="20" />
        </Field>
        <Field label="Brix Max">
          <input type="number" step="0.1" value={form.brix_max} onChange={e => set('brix_max', e.target.value)} placeholder="22" />
        </Field>
        <Field label="pH Min">
          <input type="number" step="0.1" value={form.ph_min} onChange={e => set('ph_min', e.target.value)} placeholder="2.4" />
        </Field>
        <Field label="pH Max">
          <input type="number" step="0.1" value={form.ph_max} onChange={e => set('ph_max', e.target.value)} placeholder="3.0" />
        </Field>
        <Field label="Melt Min (min)">
          <input type="number" value={form.melt_min} onChange={e => set('melt_min', e.target.value)} placeholder="8" />
        </Field>
        <Field label="Melt Max (min)">
          <input type="number" value={form.melt_max} onChange={e => set('melt_max', e.target.value)} placeholder="12" />
        </Field>
      </div>

      <Field label="Derived From">
        <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
          <option value="">— none —</option>
          {recipes.filter(r => !initial || r.id !== initial.id).map(r => (
            <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>
          ))}
        </select>
      </Field>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Ingredients</label>
        <IngredientTable
          ingredients={form.ingredients}
          onChange={ings => set('ingredients', ings)}
        />
      </div>

      <Field label="Notes" style={{ marginTop: 12 }}>
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Process notes, observations…" />
      </Field>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Create recipe'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function RecipeCard({ recipe, recipes, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [ingredients, setIngredients] = useState(null)

  const loadIngredients = async () => {
    if (!ingredients) {
      const data = await api.getIngredients(recipe.id)
      setIngredients(data)
    }
    setExpanded(e => !e)
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{recipe.sku}</span>
          {recipe.version && <span className="text-muted text-sm">v{recipe.version}</span>}
          <Badge status={recipe.status} />
          {recipe.expression && <span style={{ color: 'var(--text-secondary)' }}>{recipe.expression}</span>}
          {recipe.spirit_pairing && (
            <span className="text-sm" style={{ color: 'var(--amber)', background: 'var(--amber-light)', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
              {recipe.spirit_pairing}
            </span>
          )}
        </div>
        <div className="flex gap-8 items-center">
          <button className="btn btn-sm btn-ghost" onClick={loadIngredients}>
            {expanded ? 'Hide' : 'Ingredients'}
          </button>
          <button className="btn btn-sm" onClick={() => onEdit(recipe)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(recipe.id)}>Delete</button>
        </div>
      </div>

      <div className="card-body">
        <div className="targets">
          {recipe.brix_min != null && (
            <div className="target-item">
              <span className="target-label">Brix</span>
              <span className="target-value">{recipe.brix_min}–{recipe.brix_max} °Bx</span>
            </div>
          )}
          {recipe.ph_min != null && (
            <div className="target-item">
              <span className="target-label">pH</span>
              <span className="target-value">{recipe.ph_min}–{recipe.ph_max}</span>
            </div>
          )}
          {recipe.melt_min != null && (
            <div className="target-item">
              <span className="target-label">Melt</span>
              <span className="target-value">{recipe.melt_min}–{recipe.melt_max} min</span>
            </div>
          )}
          {recipe.mold_type && (
            <div className="target-item">
              <span className="target-label">Mold</span>
              <span className="target-value">{recipe.mold_type}</span>
            </div>
          )}
        </div>
        {recipe.notes && (
          <p className="text-sm text-muted" style={{ marginTop: 8 }}>{recipe.notes}</p>
        )}

        {expanded && ingredients && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: 'var(--border-subtle)' }}>
            {ingredients.length === 0
              ? <p className="text-sm text-muted">No ingredients recorded.</p>
              : (
                <table style={{ fontSize: 13, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Brand', 'Amount', 'Unit'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', paddingBottom: 6, paddingRight: 16 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map(ing => (
                      <tr key={ing.id}>
                        <td style={{ paddingRight: 16, paddingBottom: 4 }}>{ing.name}</td>
                        <td style={{ paddingRight: 16, paddingBottom: 4, color: 'var(--text-secondary)' }}>{ing.brand ?? '—'}</td>
                        <td style={{ paddingRight: 16, paddingBottom: 4, fontWeight: 600 }}>{ing.amount}</td>
                        <td style={{ paddingBottom: 4, color: 'var(--text-secondary)' }}>{ing.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default function RecipesView() {
  const [recipes, setRecipes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.getRecipes().then(setRecipes).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateRecipe(editing.id, payload)
    } else {
      await api.createRecipe(payload)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleEdit = async (recipe) => {
    const ingredients = await api.getIngredients(recipe.id)
    setEditing({ ...recipe, _ingredients: ingredients })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recipe? This will also remove all linked batches, freeze tests, and tastings.')) return
    await api.deleteRecipe(id)
    load()
  }

  const handleCancel = () => { setShowForm(false); setEditing(null) }

  return (
    <div>
      <SectionHeader
        title="Recipes"
        action={
          <button
            className={`form-toggle-btn${showForm ? ' open' : ''}`}
            onClick={() => { setShowForm(s => !s); if (editing) setEditing(null) }}
          >
            {showForm && !editing ? '✕ Cancel' : '+ New Recipe'}
          </button>
        }
      />

      {showForm && (
        <RecipeForm
          recipes={recipes}
          initial={editing}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : recipes.length === 0
          ? <div className="empty-state"><p>No recipes yet. Create the first one above.</p></div>
          : (
            <div className="card-list">
              {recipes.map(r => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  recipes={recipes}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
      }
    </div>
  )
}
