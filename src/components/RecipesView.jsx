import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Badge from './shared/Badge.jsx'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const EMPTY_RECIPE = {
  sku: '', expression: '', version: '1.0', status: 'active',
  brix_min: '', brix_max: '', ph_min: '', ph_max: '',
  melt_min: '', melt_max: '', notes: '',
  ingredients: [{ catalog_id: '', name: '', amount: '', unit: 'ml' }]
}

// Compact inline min–max range input pair
function RangeInput({ label, minVal, maxVal, onMin, onMax, unit = '', minPlaceholder = 'min', maxPlaceholder = 'max' }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number" step="0.1" value={minVal}
          onChange={e => onMin(e.target.value)}
          placeholder={minPlaceholder}
          style={{ flex: 1, minWidth: 0 }}
        />
        <span style={{ color: 'var(--text-tertiary)', fontSize: 13, whiteSpace: 'nowrap' }}>–</span>
        <input
          type="number" step="0.1" value={maxVal}
          onChange={e => onMax(e.target.value)}
          placeholder={maxPlaceholder}
          style={{ flex: 1, minWidth: 0 }}
        />
        {unit && <span style={{ color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>{unit}</span>}
      </div>
    </div>
  )
}

// Sliding scale viz for brix/pH showing target band + batch dots
function RangeViz({ label, min, max, batches, field, unit = '' }) {
  if (min == null || max == null) return null
  const padding = (max - min) * 1.5
  const vizMin = Math.max(0, min - padding)
  const vizMax = max + padding
  const range = vizMax - vizMin

  const toPercent = (v) => Math.max(0, Math.min(100, ((v - vizMin) / range) * 100))
  const bandLeft = toPercent(min)
  const bandWidth = toPercent(max) - bandLeft

  const batchValues = (batches ?? [])
    .map(b => b[field])
    .filter(v => v != null)

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 6 }}>
        {label}: {min}–{max}{unit}
      </div>
      <div style={{ position: 'relative', height: 28, background: 'var(--bg)', border: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {/* target band */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${bandLeft}%`, width: `${bandWidth}%`,
          background: 'var(--accent-light)', borderLeft: '2px solid var(--accent)', borderRight: '2px solid var(--accent)',
          opacity: 0.7
        }} />
        {/* batch dots */}
        {batchValues.map((v, i) => {
          const pct = toPercent(v)
          const inRange = v >= min && v <= max
          return (
            <div key={i} title={`${v}${unit}`} style={{
              position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
              left: `${pct}%`,
              width: 10, height: 10, borderRadius: '50%',
              background: inRange ? 'var(--green)' : 'var(--amber)',
              border: '1.5px solid white',
              zIndex: 2,
            }} />
          )
        })}
      </div>
      {batchValues.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          {batchValues.length} batch{batchValues.length !== 1 ? 'es' : ''} plotted
          {batchValues.some(v => v < min || v > max) && (
            <span style={{ color: 'var(--amber)', marginLeft: 6 }}>
              · {batchValues.filter(v => v < min || v > max).length} out of range
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const CUSTOM_UNITS = ['ml', 'oz', 'g', 'tsp', 'tbsp', 'cup', 'unit']

function IngredientTable({ ingredients, catalog, onChange }) {
  const update = (idx, field, val) => {
    const next = ingredients.map((ing, i) => {
      if (i !== idx) return ing
      const updated = { ...ing, [field]: val }
      // if catalog item selected, auto-fill name and unit from catalog
      if (field === 'catalog_id') {
        if (val) {
          const item = catalog.find(c => c.id === val)
          if (item) { updated.name = item.name; updated.unit = item.unit }
        } else {
          updated.name = ''
          updated.unit = 'ml'
        }
      }
      return updated
    })
    onChange(next)
  }
  const add = () => onChange([...ingredients, { catalog_id: '', name: '', amount: '', unit: 'ml' }])
  const remove = (idx) => onChange(ingredients.filter((_, i) => i !== idx))

  return (
    <div style={{ marginTop: 4 }}>
      <table className="ing-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Ingredient</th>
            <th style={{ width: '18%' }}>Amount</th>
            <th style={{ width: '14%' }}>Unit</th>
            <th style={{ width: '20%' }}>Cost</th>
            <th style={{ width: '8%' }}></th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, i) => {
            const catalogItem = catalog.find(c => c.id === ing.catalog_id)
            // Unit: from catalog if linked, otherwise allow manual select
            const displayUnit = catalogItem ? catalogItem.unit : ing.unit
            const cost = catalogItem?.cost_per_unit != null && ing.amount !== ''
              ? (Number(ing.amount) * catalogItem.cost_per_unit).toFixed(4)
              : null
            return (
              <tr key={i}>
                <td>
                  <select
                    value={ing.catalog_id ?? ''}
                    onChange={e => update(i, 'catalog_id', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">— custom —</option>
                    {catalog.map(c => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
                  </select>
                  {!ing.catalog_id && (
                    <input
                      style={{ marginTop: 4 }}
                      value={ing.name}
                      onChange={e => update(i, 'name', e.target.value)}
                      placeholder="Custom ingredient name"
                    />
                  )}
                </td>
                <td><input type="number" value={ing.amount} onChange={e => update(i, 'amount', e.target.value)} placeholder="0" /></td>
                <td>
                  {catalogItem ? (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: '4px 0', display: 'block' }}>
                      {catalogItem.unit}
                    </span>
                  ) : (
                    <select value={ing.unit} onChange={e => update(i, 'unit', e.target.value)}>
                      {CUSTOM_UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ fontSize: 12, color: cost ? 'var(--text)' : 'var(--text-tertiary)' }}>
                  {cost ? `$${cost}` : '—'}
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(i)} type="button">✕</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button className="btn btn-sm btn-ghost" onClick={add} type="button">+ Add ingredient</button>
    </div>
  )
}

function RecipeForm({ recipes, catalog, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    ...initial,
    ingredients: initial._ingredients ?? []
  } : EMPTY_RECIPE)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Live total cost preview in form
  const formCost = form.ingredients.reduce((sum, ing) => {
    const item = catalog.find(c => c.id === ing.catalog_id)
    if (item?.cost_per_unit != null && ing.amount !== '') {
      return sum + Number(ing.amount) * item.cost_per_unit
    }
    return sum
  }, 0)
  const hasAnyCost = form.ingredients.some(ing => catalog.find(c => c.id === ing.catalog_id)?.cost_per_unit != null)

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
      ingredients: form.ingredients.filter(i => i.name.trim() || i.catalog_id),
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
        <Field label="Name">
          <input value={form.expression} onChange={e => set('expression', e.target.value)} placeholder="Honey Lemon" />
        </Field>
        <Field label="Version">
          <input value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
        </Field>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={{ maxWidth: 200 }}>
            <option value="active">Active</option>
            <option value="experimental">Experimental</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>

      <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', margin: '12px 0 8px' }}>
        Target Ranges
      </div>
      <div className="form-row three-col">
        <RangeInput
          label="Target Brix"
          minVal={form.brix_min} maxVal={form.brix_max}
          onMin={v => set('brix_min', v)} onMax={v => set('brix_max', v)}
          unit="°Bx" minPlaceholder="20" maxPlaceholder="22"
        />
        <RangeInput
          label="Target pH"
          minVal={form.ph_min} maxVal={form.ph_max}
          onMin={v => set('ph_min', v)} onMax={v => set('ph_max', v)}
          minPlaceholder="2.4" maxPlaceholder="3.0"
        />
        <RangeInput
          label="Melt Window"
          minVal={form.melt_min} maxVal={form.melt_max}
          onMin={v => set('melt_min', v)} onMax={v => set('melt_max', v)}
          unit="min" minPlaceholder="8" maxPlaceholder="12"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Ingredients</label>
        <IngredientTable
          ingredients={form.ingredients}
          catalog={catalog}
          onChange={ings => set('ingredients', ings)}
        />
        {hasAnyCost && (
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Est. cost: <span style={{ color: 'var(--accent)' }}>${formCost.toFixed(4)}</span>
            <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>per batch recipe volume</span>
          </div>
        )}
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

function RecipeCard({ recipe, catalog, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [ingredients, setIngredients] = useState(null)
  const [costData, setCostData] = useState(null)
  const [batches, setBatches] = useState(null)

  const loadDetails = async () => {
    if (!ingredients) {
      const [ings, cost, batchList] = await Promise.all([
        api.getIngredients(recipe.id),
        api.getRecipeCost(recipe.id),
        api.getRecipeBatches(recipe.id),
      ])
      setIngredients(ings)
      setCostData(cost)
      setBatches(batchList)
    }
    setExpanded(e => !e)
  }

  const hasViz = recipe.brix_min != null || recipe.ph_min != null

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{recipe.sku}</span>
          {recipe.version && <span className="text-muted text-sm">v{recipe.version}</span>}
          <Badge status={recipe.status} />
          {recipe.expression && <span style={{ color: 'var(--text-secondary)' }}>{recipe.expression}</span>}
        </div>
        <div className="flex gap-8 items-center">
          <button className="btn btn-sm btn-ghost" onClick={loadDetails}>
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button className="btn btn-sm" onClick={() => onEdit(recipe)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(recipe.id)}>Delete</button>
        </div>
      </div>

      <div className="card-body">
        {recipe.melt_min != null && (
          <div className="targets">
            <div className="target-item">
              <span className="target-label">Melt</span>
              <span className="target-value">{recipe.melt_min}–{recipe.melt_max} min</span>
            </div>
          </div>
        )}

        {recipe.notes && (
          <p className="text-sm text-muted" style={{ marginTop: 8 }}>{recipe.notes}</p>
        )}

        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: 'var(--border-subtle)' }}>
            {/* Sliding scale viz */}
            {hasViz && (
              <div style={{ marginBottom: 16 }}>
                <RangeViz
                  label="Target Brix"
                  min={recipe.brix_min} max={recipe.brix_max}
                  batches={batches ?? []}
                  field="observed_brix"
                  unit=" °Bx"
                />
                <RangeViz
                  label="Target pH"
                  min={recipe.ph_min} max={recipe.ph_max}
                  batches={batches ?? []}
                  field="observed_ph"
                />
              </div>
            )}

            {/* Ingredients */}
            {ingredients && (
              ingredients.length === 0
                ? <p className="text-sm text-muted">No ingredients recorded.</p>
                : (
                  <table style={{ fontSize: 13, width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                    <thead>
                      <tr>
                        {['Ingredient', 'Amount', 'Unit', 'Cost'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', paddingBottom: 6, paddingRight: 16 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map(ing => {
                        const lineCost = ing.cost_per_unit != null
                          ? `$${(ing.amount * ing.cost_per_unit).toFixed(4)}`
                          : '—'
                        return (
                          <tr key={ing.id}>
                            <td style={{ paddingRight: 16, paddingBottom: 4 }}>{ing.catalog_name ?? ing.name}</td>
                            <td style={{ paddingRight: 16, paddingBottom: 4, fontWeight: 600 }}>{ing.amount}</td>
                            <td style={{ paddingRight: 16, paddingBottom: 4, color: 'var(--text-secondary)' }}>{ing.unit}</td>
                            <td style={{ paddingBottom: 4, color: ing.cost_per_unit != null ? 'var(--text)' : 'var(--text-tertiary)' }}>{lineCost}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
            )}

            {/* Total cost */}
            {costData && (costData.total != null) && (
              <div style={{ padding: '10px 14px', background: 'var(--accent-light)', border: '0.5px solid #c6d9b0', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Total Cost Per Recipe Batch: </span>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>${costData.total.toFixed(4)}</span>
                {costData.partial && (
                  <span className="text-muted text-sm" style={{ marginLeft: 8 }}>(partial — some ingredients missing cost)</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RecipesView() {
  const [recipes, setRecipes] = useState([])
  const [catalog, setCatalog] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getRecipes(), api.getCatalog()])
    .then(([r, c]) => { setRecipes(r); setCatalog(c) })
    .finally(() => setLoading(false))
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
          catalog={catalog}
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
                  catalog={catalog}
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
