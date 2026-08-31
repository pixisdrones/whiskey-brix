import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import { recipeColor } from '../utils/recipeColors.js'

const formatAmt = (n) => {
  if (n == null) return '—'
  const r = Math.round(n * 100) / 100
  return r % 1 === 0 ? String(r) : r % 0.1 === 0 ? r.toFixed(1) : r.toFixed(2)
}

const PHASES = ['prep', 'mix', 'fill', 'freeze']
const PHASE_LABELS = { prep: 'Prep', mix: 'Mix', fill: 'Fill', freeze: 'Freeze' }

const UNIT_OPTIONS = [
  { id: 'ml',   label: 'ml' },
  { id: 'floz', label: 'fl oz' },
  { id: 'cups', label: 'cups' },
]

function convertUnit(amount, unit, system) {
  if (amount == null) return { amount, unit }
  if (system === 'floz' && unit === 'ml') return { amount: amount * 0.033814, unit: 'fl oz' }
  if (system === 'cups' && unit === 'ml') return { amount: amount / 236.588, unit: 'cups' }
  return { amount, unit }
}

// Replaces all "N ml" occurrences in prose text or HTML strings with the chosen unit.
function convertTextUnits(text, system) {
  if (!text || system === 'ml') return text
  return text.replace(/(\d+(?:\.\d+)?)\s*ml/g, (_, num) => {
    const n = parseFloat(num)
    if (system === 'floz') return `${formatAmt(n * 0.033814)} fl oz`
    if (system === 'cups') return `${formatAmt(n / 236.588)} cups`
    return `${num} ml`
  })
}

// Like convertTextUnits but also multiplies all ml quantities by scale first.
// Use for per-recipe instruction text where the session amount differs from one batch.
function convertAndScaleText(text, system, scale) {
  if (!text) return text
  const s = scale ?? 1
  return text.replace(/(\d+(?:\.\d+)?)\s*ml/g, (_, num) => {
    const n = parseFloat(num) * s
    if (system === 'floz') return `${formatAmt(n * 0.033814)} fl oz`
    if (system === 'cups') return `${formatAmt(n / 236.588)} cups`
    return `${formatAmt(n)} ml`
  })
}

// Groups steps by phase, merges steps with the same label across recipes, and
// aggregates ingredient quantities from ingredient_refs for each merged group.
function buildGuide(items) {
  return PHASES.map(phase => {
    const all = items.flatMap(it =>
      (it.steps ?? []).filter(s => s.phase === phase).map(s => ({ ...s, _it: it }))
    )
    if (all.length === 0) return null

    const byLabel = {}
    all.forEach((s, idx) => {
      const key = s.label.toLowerCase().trim()
      if (!byLabel[key]) byLabel[key] = { label: s.label, detail: s.detail, duration_min: s.duration_min, minOrder: s.order ?? idx, entries: [] }
      if ((s.order ?? idx) < byLabel[key].minOrder) byLabel[key].minOrder = s.order ?? idx
      byLabel[key].entries.push(s)
    })

    const groups = Object.values(byLabel).sort((a, b) => a.minOrder - b.minOrder).map(g => {
      const ingTotals = {}
      g.entries.forEach(({ ingredient_refs, _it }) => {
        (ingredient_refs ?? []).forEach(refName => {
          const ing = _it.ingredients.find(i => i.name === refName)
          if (!ing) return
          if (!ingTotals[refName]) ingTotals[refName] = { name: refName, unit: ing.unit, total: 0, byRecipe: [] }
          const scaledAmt = (ing.amount ?? 0) * _it.scale
          ingTotals[refName].total += scaledAmt
          ingTotals[refName].byRecipe.push({ expression: _it.expression || _it.sku, recipe_id: _it.recipe_id, amount: scaledAmt })
        })
      })
      return { ...g, ingAmts: Object.values(ingTotals) }
    })

    return { phase, groups }
  }).filter(Boolean)
}

function PrepList({ data, onClear }) {
  const { items, aggregated } = data
  const [unitSystem, setUnitSystem] = useState('ml')
  const [checkedSteps, setCheckedSteps] = useState(new Set())
  const conv = (amount, unit) => convertUnit(amount, unit, unitSystem)
  const toggleStep = (key) => setCheckedSteps(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  const guide = buildGuide(items)
  const prepGroups = guide.find(g => g.phase === 'prep')?.groups ?? []
  const hasGuide = prepGroups.length > 0 ||
    items.some(it => (it.steps ?? []).some(s => s.phase === 'mix'))

  const [mixOrder, setMixOrder] = useState(() => items.map(it => it.recipe_id))
  const [collapsedRecipes, setCollapsedRecipes] = useState(new Set())
  const [dragOverId, setDragOverId] = useState(null)
  const dragIdRef = useRef(null)

  const orderedItems = mixOrder.map(id => items.find(it => it.recipe_id === id)).filter(Boolean)

  const onDragStart = (id) => { dragIdRef.current = id }
  const onDragOver = (e, id) => { e.preventDefault(); setDragOverId(id) }
  const onDrop = (id) => {
    const from = dragIdRef.current
    if (!from || from === id) return
    setMixOrder(prev => {
      const next = [...prev]
      const fi = next.indexOf(from), ti = next.indexOf(id)
      next.splice(fi, 1)
      next.splice(ti, 0, from)
      return next
    })
    setDragOverId(null)
    dragIdRef.current = null
  }
  const onDragEnd = () => { setDragOverId(null); dragIdRef.current = null }

  // Compute scaled ingredient amounts for a single per-recipe step
  const stepIngAmts = (s, it) => {
    const totals = {}
    ;(s.ingredient_refs ?? []).forEach(refName => {
      const ing = it.ingredients.find(i => i.name === refName)
      if (!ing) return
      if (!totals[refName]) totals[refName] = { name: refName, unit: ing.unit, total: 0, byRecipe: [] }
      const amt = (ing.amount ?? 0) * it.scale
      totals[refName].total += amt
      totals[refName].byRecipe.push({ expression: it.expression || it.sku, recipe_id: it.recipe_id, amount: amt })
    })
    return Object.values(totals)
  }

  const mkCheckbox = (checked) => (
    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-color)'}`, background: checked ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  )

  const ingAmtRows = (ingAmts, isMerged) => ingAmts.map(ing => {
    const { amount: ta, unit: tu } = conv(ing.total, ing.unit)
    return (
      <div key={ing.name} style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 5 }}>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatAmt(ta)} {tu}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{ing.name}</span>
        {isMerged && ing.byRecipe.length > 1 && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            ({ing.byRecipe.map(r => { const { amount: ra } = conv(r.amount, ing.unit); return `${r.expression} ${formatAmt(ra)}` }).join(' + ')})
          </span>
        )}
      </div>
    )
  })

  const copyText = () => {
    const lines = [
      'MIXER PREP LIST',
      '',
      'Recipes:',
      ...items.map(it => `  ${it.expression || it.sku}  ${it.label}`),
      '',
      'Ingredients:',
      ...aggregated.map(ing => {
        const c = conv(ing.amount, ing.unit)
        return `  ${formatAmt(c.amount)} ${c.unit.padEnd(5)}  ${ing.name}`
      }),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Prep List</h2>
        <div className="flex gap-8" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: 'var(--border)', overflow: 'hidden' }}>
            {UNIT_OPTIONS.map(opt => (
              <button key={opt.id} type="button" onClick={() => setUnitSystem(opt.id)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: unitSystem === opt.id ? 700 : 400, background: unitSystem === opt.id ? 'var(--accent)' : 'var(--surface)', color: unitSystem === opt.id ? '#fff' : 'var(--text-secondary)', border: 'none', borderRight: '1px solid var(--border-color)', cursor: 'pointer' }}>
                {opt.label}
              </button>
            ))}
          </div>
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
                  <span style={{ fontSize: 12, color: color?.text ?? 'var(--text-secondary)', opacity: 0.7 }}>{it.label}</span>
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
                {aggregated.map((ing, i) => {
                  const { amount, unit } = conv(ing.amount, ing.unit)
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{formatAmt(amount)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{unit}</td>
                      <td style={{ fontWeight: 600 }}>{ing.name}</td>
                      {items.length > 1 && <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{ing.recipes.join(', ')}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-recipe breakdown when multiple recipes */}
        {items.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 12 }}>Per-Recipe Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {items.map(it => {
                const color = recipeColor(it.expression)
                return (
                  <div key={it.recipe_id} style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)', marginBottom: 8 }}>
                      {it.expression || it.sku}
                      <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, opacity: 0.7 }}>{it.label}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {it.ingredients.map((ing, j) => {
                        const { amount: dispAmt, unit: dispUnit } = conv(ing.amount * it.scale, ing.unit)
                        const { amount: baseAmt } = conv(ing.amount, ing.unit)
                        return (
                          <div key={j} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                            <span style={{ fontWeight: 700, minWidth: 72, textAlign: 'right', color: color?.text ?? 'var(--accent)' }}>
                              {formatAmt(dispAmt)} {dispUnit}
                            </span>
                            <span style={{ color: color?.text ?? 'var(--text-secondary)', opacity: 0.85 }}>{ing.name}</span>
                            {it.scale !== 1 && (
                              <span style={{ color: color?.text ?? 'var(--text-tertiary)', opacity: 0.5, fontSize: 10 }}>
                                ({formatAmt(baseAmt)}×{Math.round(it.scale * 100) / 100})
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {it.recipe_body && (
                      <div
                        className="recipe-body"
                        dangerouslySetInnerHTML={{ __html: convertAndScaleText(it.recipe_body, unitSystem, it.scale) }}
                        style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color?.border ?? 'var(--border-color)'}`, fontSize: 12, color: color?.text ?? 'var(--text)', lineHeight: 1.65, opacity: 0.92 }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Session Plan — Prep merged, Mix/Fill per recipe, Freeze merged */}
        {hasGuide && (
          <div style={{ marginTop: items.length > 1 ? 0 : 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 16 }}>Session Plan</div>

            {/* PREP — merged across all recipes */}
            {prepGroups.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)', marginBottom: 12, paddingBottom: 5, borderBottom: '1px solid var(--border-color)' }}>Prep</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {prepGroups.map(g => {
                    const key = `prep__${g.label.toLowerCase().trim()}`
                    const checked = checkedSteps.has(key)
                    const isMerged = g.entries.length > 1
                    return (
                      <div key={key} onClick={() => toggleStep(key)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', opacity: checked ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                        {mkCheckbox(checked)}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: (g.ingAmts.length > 0 || g.detail) ? 4 : 0 }}>
                            {items.length > 1 && g.entries.map(({ _it }) => {
                              const color = recipeColor(_it.expression)
                              return <span key={_it.recipe_id} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}`, color: color?.text ?? 'var(--text)' }}>{_it.expression || _it.sku}</span>
                            })}
                            <span style={{ fontWeight: 600, fontSize: 13, textDecoration: checked ? 'line-through' : 'none' }}>{g.label}</span>
                            {g.duration_min != null && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{g.duration_min} min</span>}
                          </div>
                          {g.ingAmts.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: g.detail ? 4 : 0 }}>
                              {isMerged && g.ingAmts.some(i => i.byRecipe.length > 1) && (
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-tertiary)', marginBottom: 1 }}>Session total</div>
                              )}
                              {ingAmtRows(g.ingAmts, isMerged)}
                            </div>
                          )}
                          {(g.detail && (!isMerged || !g.ingAmts.length)) && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {isMerged
                                ? convertTextUnits(g.detail, unitSystem)
                                : convertAndScaleText(g.detail, unitSystem, g.entries[0]._it.scale)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MIX — per recipe, collapsible + draggable */}
            {orderedItems.map(it => {
              const mixSteps = (it.steps ?? []).filter(s => s.phase === 'mix').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              if (!mixSteps.length) return null
              const color = recipeColor(it.expression)
              const isCollapsed = collapsedRecipes.has(it.recipe_id)
              const isDragTarget = dragOverId === it.recipe_id
              return (
                <div
                  key={it.recipe_id}
                  draggable
                  onDragStart={() => onDragStart(it.recipe_id)}
                  onDragOver={e => onDragOver(e, it.recipe_id)}
                  onDrop={() => onDrop(it.recipe_id)}
                  onDragEnd={onDragEnd}
                  style={{ marginBottom: 16, borderRadius: 'var(--radius-sm)', border: `1px solid ${isDragTarget ? 'var(--accent)' : (color?.border ?? 'var(--border-color)')}`, background: color?.bg ?? 'var(--bg)', transition: 'border-color 0.15s', opacity: dragIdRef.current === it.recipe_id ? 0.5 : 1 }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'grab', borderBottom: isCollapsed ? 'none' : `1px solid ${color?.border ?? 'var(--border-color)'}` }}
                    onClick={() => setCollapsedRecipes(prev => { const n = new Set(prev); n.has(it.recipe_id) ? n.delete(it.recipe_id) : n.add(it.recipe_id); return n })}
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ flexShrink: 0, color: color?.text ?? 'var(--text-tertiary)', opacity: 0.4, cursor: 'grab' }}>
                      <circle cx="3" cy="3" r="1.2" fill="currentColor"/><circle cx="7" cy="3" r="1.2" fill="currentColor"/>
                      <circle cx="3" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/>
                      <circle cx="3" cy="11" r="1.2" fill="currentColor"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/>
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)', flex: 1 }}>{it.expression || it.sku}</span>
                    <span style={{ fontSize: 12, color: color?.text ?? 'var(--text)', opacity: 0.65 }}>{it.label}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', color: color?.text ?? 'var(--text-tertiary)', opacity: 0.5 }}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {!isCollapsed && (
                    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {mixSteps.map((s, i) => {
                        const sk = `${it.recipe_id}__mix__${s.order ?? i}`
                        const checked = checkedSteps.has(sk)
                        const rawAmts = stepIngAmts(s, it)
                        const sAmts = rawAmts.length > 0 ? rawAmts
                          : s.label?.toLowerCase().trim() === 'combine ingredients'
                            ? it.ingredients.map(ing => ({ name: ing.name, unit: ing.unit, total: (ing.amount ?? 0) * it.scale, byRecipe: [] }))
                            : rawAmts
                        return (
                          <div key={sk} onClick={e => { e.stopPropagation(); toggleStep(sk) }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', opacity: checked ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                            {mkCheckbox(checked)}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: (sAmts.length > 0 || s.detail) ? 4 : 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 13, textDecoration: checked ? 'line-through' : 'none' }}>{s.label}</span>
                                {s.duration_min != null && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.duration_min} min</span>}
                              </div>
                              {sAmts.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: s.detail ? 4 : 0 }}>
                                  {ingAmtRows(sAmts, false)}
                                </div>
                              )}
                              {s.detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{convertAndScaleText(s.detail, unitSystem, it.scale)}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
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
    setSession(prev => [...prev, { recipe_id: recipe.id, expression: recipe.expression, sku: recipe.sku, mode: 'cubes', batches: 1, volume_ml: 500, cube_count: 16, cube_size_oz: 4 }])
    setPrepList(null)
  }

  const removeFromSession = (recipe_id) => {
    setSession(prev => prev.filter(s => s.recipe_id !== recipe_id))
    setPrepList(null)
  }

  const updateItem = (recipe_id, updates) => {
    setSession(prev => prev.map(s => s.recipe_id === recipe_id ? { ...s, ...updates } : s))
    setPrepList(null)
  }

  const generate = async () => {
    if (session.length === 0) return
    setGenerating(true)
    try {
      const apiItems = session.map(s => {
        if (s.mode === 'volume') return { recipe_id: s.recipe_id, target_volume_ml: Math.max(1, s.volume_ml) }
        if (s.mode === 'cubes') return { recipe_id: s.recipe_id, cube_count: Math.max(1, s.cube_count), cube_size_ml: s.cube_size_oz * 29.5735 }
        return { recipe_id: s.recipe_id, batches: Math.max(1, s.batches) }
      })
      const result = await api.getMixSessionList(apiItems)
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
                    const inputStyle = { fontSize: 12, padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: 'var(--border)', background: 'var(--surface)', width: 60, textAlign: 'center' }
                    const labelStyle = { fontSize: 11, color: color?.text ?? 'var(--text-tertiary)', opacity: 0.7 }
                    return (
                      <div key={s.recipe_id} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: color?.bg ?? 'var(--bg)', border: `1px solid ${color?.border ?? 'var(--border-color)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: color?.text ?? 'var(--text)', flex: 1, minWidth: 80 }}>{s.expression || s.sku}</span>
                          <select value={s.mode} onChange={e => updateItem(s.recipe_id, { mode: e.target.value })} style={{ fontSize: 11, padding: '2px 4px', borderRadius: 'var(--radius-sm)', border: 'var(--border)', background: 'var(--surface)', cursor: 'pointer' }}>
                            <option value="batches">Batches</option>
                            <option value="volume">Volume</option>
                            <option value="cubes">Cubes</option>
                          </select>
                          {s.mode === 'batches' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <button type="button" onClick={() => updateItem(s.recipe_id, { batches: Math.max(1, s.batches - 1) })} style={{ width: 24, height: 24, borderRadius: 100, border: 'var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 14 }}>{s.batches}</span>
                              <button type="button" onClick={() => updateItem(s.recipe_id, { batches: s.batches + 1 })} style={{ width: 24, height: 24, borderRadius: 100, border: 'var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              <span style={labelStyle}>{s.batches === 1 ? 'batch' : 'batches'}</span>
                            </div>
                          )}
                          {s.mode === 'volume' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <input type="number" min={1} value={s.volume_ml} onChange={e => updateItem(s.recipe_id, { volume_ml: Number(e.target.value) })} style={{ ...inputStyle, width: 72 }} />
                              <span style={labelStyle}>ml total</span>
                            </div>
                          )}
                          {s.mode === 'cubes' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <input type="number" min={1} value={s.cube_count} onChange={e => updateItem(s.recipe_id, { cube_count: Number(e.target.value) })} style={{ ...inputStyle, width: 52 }} />
                              <span style={labelStyle}>cubes @</span>
                              <input type="number" min={0.5} step={0.5} value={s.cube_size_oz} onChange={e => updateItem(s.recipe_id, { cube_size_oz: Number(e.target.value) })} style={{ ...inputStyle, width: 48 }} />
                              <span style={labelStyle}>oz ea.</span>
                            </div>
                          )}
                          <button type="button" onClick={() => removeFromSession(s.recipe_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                        </div>
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
