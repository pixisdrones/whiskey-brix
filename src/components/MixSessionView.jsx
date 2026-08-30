import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import { recipeColor } from '../utils/recipeColors.js'

const formatAmt = (n) => {
  if (n == null) return '—'
  const r = Math.round(n * 10) / 10
  return r % 1 === 0 ? String(r) : r.toFixed(1)
}

function PrepList({ data, onClear }) {
  const { items, aggregated } = data

  const copyText = () => {
    const lines = [
      'MIXER PREP LIST',
      '',
      'Recipes:',
      ...items.map(it => `  ${it.expression || it.sku}  ×${it.batches}`),
      '',
      'Ingredients:',
      ...aggregated.map(ing => `  ${formatAmt(ing.amount)} ${ing.unit.padEnd(4)}  ${ing.name}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Prep List</h2>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={copyText}>Copy</button>
          <button className="btn btn-sm" onClick={() => window.print()}>Print</button>
          <button className="btn btn-sm" onClick={onClear}>Clear</button>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>

        {/* What you're making */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 10 }}>Making Today</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {items.map(it => {
              const color = recipeColor(it.expression)
              return (
                <div key={it.recipe_id} style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}`, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)' }}>{it.expression || it.sku}</span>
                  <span style={{ fontSize: 12, color: color?.text ?? 'var(--text-secondary)', opacity: 0.7 }}>×{it.batches}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Combined ingredient list */}
        <div style={{ marginBottom: items.length > 1 ? 24 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 10 }}>
            Combined Ingredients {aggregated.length > 0 && <span style={{ fontWeight: 400 }}>({aggregated.length} items)</span>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'right', width: 80 }}>Qty</th>
                  <th style={{ width: 60 }}>Unit</th>
                  <th>Ingredient</th>
                  {items.length > 1 && <th style={{ color: 'var(--text-tertiary)' }}>Used in</th>}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((ing, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{formatAmt(ing.amount)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{ing.unit}</td>
                    <td style={{ fontWeight: 600 }}>{ing.name}</td>
                    {items.length > 1 && <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{ing.recipes.join(', ')}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-recipe breakdown when multiple recipes */}
        {items.length > 1 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 12 }}>Per-Recipe Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {items.map(it => {
                const color = recipeColor(it.expression)
                return (
                  <div key={it.recipe_id} style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)', marginBottom: 8 }}>
                      {it.expression || it.sku}
                      {it.batches > 1 && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, opacity: 0.7 }}>×{it.batches} batches</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {it.ingredients.map((ing, j) => (
                        <div key={j} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, minWidth: 64, textAlign: 'right', color: color?.text ?? 'var(--accent)' }}>
                            {formatAmt(ing.amount * it.batches)} {ing.unit}
                          </span>
                          <span style={{ color: color?.text ?? 'var(--text-secondary)', opacity: 0.85 }}>{ing.name}</span>
                          {it.batches > 1 && (
                            <span style={{ color: color?.text ?? 'var(--text-tertiary)', opacity: 0.5, fontSize: 10 }}>
                              ({ing.amount}×{it.batches})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
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

export default function MixSessionView() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState([]) // [{ recipe_id, expression, sku, batches }]
  const [prepList, setPrepList] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.getRecipes().then(r => {
      setRecipes(r.filter(r => r.status !== 'archived'))
      setLoading(false)
    })
  }, [])

  const addToSession = (recipe) => {
    if (session.find(s => s.recipe_id === recipe.id)) return
    setSession(prev => [...prev, { recipe_id: recipe.id, expression: recipe.expression, sku: recipe.sku, batches: 1 }])
    setPrepList(null)
  }

  const removeFromSession = (recipe_id) => {
    setSession(prev => prev.filter(s => s.recipe_id !== recipe_id))
    setPrepList(null)
  }

  const setBatches = (recipe_id, n) => {
    setSession(prev => prev.map(s => s.recipe_id === recipe_id ? { ...s, batches: Math.max(1, n) } : s))
    setPrepList(null)
  }

  const generate = async () => {
    if (session.length === 0) return
    setGenerating(true)
    try {
      const result = await api.getMixSessionList(session)
      setPrepList(result)
    } finally {
      setGenerating(false)
    }
  }

  const sessionIds = new Set(session.map(s => s.recipe_id))
  const filtered = recipes.filter(r =>
    !filter ||
    r.expression?.toLowerCase().includes(filter.toLowerCase()) ||
    r.sku?.toLowerCase().includes(filter.toLowerCase())
  )

  const STATUS_ORDER = { active: 0, seasonal: 1, experimental: 2 }
  const sorted = [...filtered].sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || (a.expression || '').localeCompare(b.expression || ''))

  return (
    <div>
      <SectionHeader title="Mixer Prep" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Recipe picker */}
        <div className="card">
          <div className="card-header">
            <h2>Select Recipes</h2>
            <span className="text-muted text-sm">{recipes.length} available</span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter recipes..."
              style={{ width: '100%', marginBottom: 10 }}
            />
            {loading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted">No recipes match.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 420, overflowY: 'auto' }}>
                {sorted.map(r => {
                  const inSession = sessionIds.has(r.id)
                  const color = recipeColor(r.expression)
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: inSession ? (color?.bg ?? 'var(--accent-light)') : 'none', border: `1px solid ${inSession ? (color?.border ?? 'var(--accent)') : 'transparent'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: inSession ? 700 : 400, fontSize: 13, color: inSession ? (color?.text ?? 'var(--accent)') : 'var(--text)' }}>
                          {r.expression || r.sku}
                        </span>
                        {r.status === 'seasonal' && (
                          <span style={{ fontSize: 10, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>seasonal</span>
                        )}
                        {r.status === 'experimental' && (
                          <span style={{ fontSize: 10, color: 'var(--amber)', background: 'var(--amber-light)', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>exp</span>
                        )}
                      </div>
                      {inSession ? (
                        <button onClick={() => removeFromSession(r.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                          Remove
                        </button>
                      ) : (
                        <button onClick={() => addToSession(r)} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 100, border: `1px solid ${color?.border ?? 'var(--border-color)'}`, background: color?.bg ?? 'none', cursor: 'pointer', color: color?.text ?? 'var(--text-secondary)', fontWeight: 600 }}>
                          + Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Session builder */}
        <div className="card">
          <div className="card-header">
            <h2>Session</h2>
            {session.length > 0 && <span className="text-muted text-sm">{session.length} recipe{session.length !== 1 ? 's' : ''}</span>}
          </div>
          <div style={{ padding: '12px 16px' }}>
            {session.length === 0 ? (
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>Add recipes from the left to build your mixing session.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {session.map(s => {
                    const color = recipeColor(s.expression)
                    return (
                      <div key={s.recipe_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}` }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)', flex: 1 }}>{s.expression || s.sku}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button type="button" onClick={() => setBatches(s.recipe_id, s.batches - 1)} style={{ width: 26, height: 26, borderRadius: 100, border: 'var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 22, textAlign: 'center', fontSize: 15 }}>{s.batches}</span>
                          <button type="button" onClick={() => setBatches(s.recipe_id, s.batches + 1)} style={{ width: 26, height: 26, borderRadius: 100, border: 'var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                        <span style={{ fontSize: 11, color: color?.text ?? 'var(--text-tertiary)', opacity: 0.7, minWidth: 36 }}>{s.batches === 1 ? 'batch' : 'batches'}</span>
                        <button type="button" onClick={() => removeFromSession(s.recipe_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ width: '100%' }}>
                  {generating ? 'Generating…' : 'Generate Prep List'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {prepList && <PrepList data={prepList} onClear={() => setPrepList(null)} />}
    </div>
  )
}
