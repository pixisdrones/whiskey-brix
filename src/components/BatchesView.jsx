import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

function brixIndicator(observed, min, max) {
  if (observed == null || min == null) return null
  if (observed < min) return <span className="ind-low" title="Below target">↓ {observed}</span>
  if (observed > max) return <span className="ind-high" title="Above target">↑ {observed}</span>
  return <span className="ind-ok" title="On target">✓ {observed}</span>
}

function phIndicator(observed, min, max) {
  if (observed == null || min == null) return null
  if (observed < min) return <span className="ind-low" title="Below target">↓ {observed}</span>
  if (observed > max) return <span className="ind-high" title="Above target">↑ {observed}</span>
  return <span className="ind-ok" title="On target">✓ {observed}</span>
}

// Brix adjustment dialogue
function BrixAdjustDialog({ observed, target_min, target_max, batch_size, batch_unit, onClose }) {
  if (!observed || !target_min) return null
  const target_mid = (target_min + target_max) / 2
  const diff = observed - target_mid
  const isHigh = diff > 0

  // Simple formula: C1*V1 = C2*V2
  // To dilute (high brix): add water
  // To concentrate (low brix): add more sugar
  let suggestion = null
  if (batch_size) {
    if (isHigh) {
      // dilute: V2 = (C1*V1)/C2 → extra water = V2 - V1
      const v2 = (observed * batch_size) / target_mid
      const water = Math.round((v2 - batch_size) * 100) / 100
      suggestion = `Add ~${water} ${batch_unit} of water to dilute from ${observed} °Bx to ~${target_mid} °Bx.`
    } else {
      // Add sugar: Using approx 1% brix ≈ add 10g sugar per liter
      const brixNeeded = target_mid - observed
      // rough: each g of sugar added to V liters raises brix by ~(100/(100+amount))
      // simpler: tell user how many grams of sugar to add per liter
      const gramsPerUnit = batch_unit === 'L' ? 10 : batch_unit === 'ml' ? 0.01 : 28.3
      const grams = Math.round(brixNeeded * gramsPerUnit * batch_size * 10) / 10
      suggestion = `Add ~${grams}g of sugar (${Math.round(brixNeeded * 10) / 10} °Bx needed) to reach ~${target_mid} °Bx.`
    }
  } else {
    if (isHigh) {
      suggestion = `Brix is ${Math.abs(Math.round(diff * 10) / 10)} °Bx above target midpoint (${target_mid}). Dilute with water.`
    } else {
      suggestion = `Brix is ${Math.abs(Math.round(diff * 10) / 10)} °Bx below target midpoint (${target_mid}). Add simple syrup or sugar.`
    }
  }

  return (
    <div style={{ background: isHigh ? 'var(--amber-light)' : 'var(--blue-light)', border: `0.5px solid ${isHigh ? '#fcd34d' : '#bfdbfe'}`, borderRadius: 'var(--radius)', padding: 16, margin: '12px 0' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: isHigh ? 'var(--amber)' : 'var(--blue)', marginBottom: 6 }}>
        Brix Adjustment: {observed} °Bx → target {target_min}–{target_max} °Bx
      </div>
      <p style={{ fontSize: 13, color: isHigh ? '#92400e' : '#1e3a5f' }}>{suggestion}</p>
      <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={onClose}>Dismiss</button>
    </div>
  )
}

// Sliding scale viz for a single observed value against a target range
function RangeViz({ label, min, max, value, unit = '' }) {
  if (min == null || max == null || value == null) return null
  const padding = Math.max((max - min) * 1.5, 0.5)
  const vizMin = Math.max(0, min - padding)
  const vizMax = max + padding
  const range = vizMax - vizMin
  const toPercent = (v) => Math.max(0, Math.min(100, ((v - vizMin) / range) * 100))
  const bandLeft = toPercent(min)
  const bandWidth = toPercent(max) - bandLeft
  const pct = toPercent(value)
  const inRange = value >= min && value <= max

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
        {label}: target {min}–{max}{unit} ·{' '}
        <span style={{ color: inRange ? 'var(--green)' : 'var(--amber)' }}>
          observed {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 24, background: 'var(--bg)', border: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${bandLeft}%`, width: `${bandWidth}%`,
          background: 'var(--accent-light)', borderLeft: '2px solid var(--accent)', borderRight: '2px solid var(--accent)',
          opacity: 0.7
        }} />
        <div title={`${value}${unit}`} style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${pct}%`,
          width: 10, height: 10, borderRadius: '50%',
          background: inRange ? 'var(--green)' : 'var(--amber)',
          border: '1.5px solid white',
          zIndex: 2,
        }} />
      </div>
    </div>
  )
}

// Volume unit conversion helpers
const TO_ML = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41, cup: 236.588, tsp: 4.92892, tbsp: 14.7868 }
const TO_G  = { g: 1, kg: 1000 }
function convertVolume(amount, fromUnit, toUnit) {
  const fromFactor = TO_ML[fromUnit]
  const toFactor = TO_ML[toUnit]
  if (!fromFactor || !toFactor) return null // non-volume unit, can't convert
  return (amount * fromFactor) / toFactor
}
function formatAmt(val) {
  if (val == null) return '—'
  // Show up to 4 sig figs, trimming trailing zeros
  return parseFloat(val.toPrecision(4)).toString()
}
function getCompatibleUnits(unit) {
  if (TO_ML[unit]) return ['oz', 'ml', 'L', 'cup', 'tsp', 'tbsp']
  if (TO_G[unit])  return ['g', 'kg']
  return [unit]
}
function convertToUnit(amount, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount
  if (TO_ML[fromUnit] && TO_ML[toUnit]) return (amount * TO_ML[fromUnit]) / TO_ML[toUnit]
  if (TO_G[fromUnit]  && TO_G[toUnit])  return (amount * TO_G[fromUnit])  / TO_G[toUnit]
  return null
}

function scaleRecipeBody(html, scaleFactor) {
  if (!html || !scaleFactor || Math.abs(scaleFactor - 1) < 0.005) return html
  const fmt = (n) => {
    const v = n * scaleFactor
    if (v >= 100) return Math.round(v).toString()
    if (v >= 10) return parseFloat(v.toFixed(1)).toString()
    return parseFloat(v.toFixed(2)).toString()
  }
  // gal before g so "gal" is matched before standalone "g"
  const U = 'oz|ml|L|cups?|tsp|tbsp|kg|lb|liters?|gal|g'
  // Scale ranges: "1–3 oz" or "1-3 oz"
  let out = html.replace(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*([–—-])\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})\\b`, 'gi'),
    (_, n1, sep, n2, unit) => `${fmt(parseFloat(n1))}${sep}${fmt(parseFloat(n2))} ${unit}`
  )
  // Scale single values: "1 oz", "28g", etc.
  out = out.replace(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})\\b`, 'gi'),
    (_, n, unit) => `${fmt(parseFloat(n))} ${unit}`
  )
  return out
}

// Step 1: Batch Planner — scale ingredients
function BatchPlanner({ recipes, onProceed, onCancel, initialRecipeId }) {
  const [recipeId, setRecipeId] = useState(initialRecipeId ?? '')
  const [planMode, setPlanMode] = useState('volume') // 'volume' | 'cubes' | 'ingredient'
  const [targetSize, setTargetSize] = useState('')
  const [targetUnit, setTargetUnit] = useState('L')
  const [cubeSize, setCubeSize] = useState('')
  const [numCubes, setNumCubes] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [useExtract, setUseExtract] = useState(false)
  const [scaledInstructions, setScaledInstructions] = useState(true)
  // "By Ingredient" mode state
  const [selectedIngId, setSelectedIngId] = useState('')
  const [ingAmount, setIngAmount] = useState('')
  const [ingUnit, setIngUnit] = useState('oz')
  const [basePlan, setBasePlan] = useState(null)
  const [ingLoading, setIngLoading] = useState(false)

  const resetPlan = () => { setPlan(null); setUseExtract(false); setScaledInstructions(true) }

  const switchMode = (val) => {
    setPlanMode(val)
    resetPlan()
    if (val !== 'ingredient') { setSelectedIngId(''); setIngAmount(''); setBasePlan(null) }
  }

  // Load ingredient list when recipe is selected in ingredient mode
  useEffect(() => {
    if (planMode !== 'ingredient' || !recipeId) { setBasePlan(null); setSelectedIngId(''); return }
    setIngLoading(true)
    resetPlan()
    api.planBatch({ recipe_id: recipeId, target_size: 1, target_unit: 'ml' })
      .then(r => { setBasePlan(r); setSelectedIngId(''); setIngAmount('') })
      .catch(() => setBasePlan(null))
      .finally(() => setIngLoading(false))
  }, [recipeId, planMode])

  // When ingredient selection changes, reset ingUnit to a compatible default
  const selectedIng = basePlan?.ingredients.find(i => i.id === selectedIngId) ?? null
  const ingNativeUnit = selectedIng ? (selectedIng.catalog_unit ?? selectedIng.unit) : null
  const compatibleUnits = ingNativeUnit ? getCompatibleUnits(ingNativeUnit) : ['oz', 'ml', 'L', 'cup']
  useEffect(() => {
    if (!ingNativeUnit) return
    const units = getCompatibleUnits(ingNativeUnit)
    if (!units.includes(ingUnit)) setIngUnit(units[0])
  }, [selectedIngId])

  const totalOz = planMode === 'cubes' && cubeSize && numCubes
    ? Math.round(Number(cubeSize) * Number(numCubes) * 100) / 100
    : null

  const handlePlan = async (e) => {
    e.preventDefault()
    if (!recipeId) return

    if (planMode === 'ingredient') {
      if (!selectedIngId || !ingAmount || !basePlan) return
      const ing = basePlan.ingredients.find(i => i.id === selectedIngId)
      if (!ing || !ing.amount) return
      const nativeUnit = ing.catalog_unit ?? ing.unit
      const amountInNative = convertToUnit(Number(ingAmount), ingUnit, nativeUnit)
      if (amountInNative == null || amountInNative <= 0) return
      const sf = amountInNative / ing.amount
      setPlan({
        ...basePlan,
        scale_factor: Math.round(sf * 1000) / 1000,
        ingredients: basePlan.ingredients.map(i => ({ ...i, scaled_amount: i.amount * sf })),
        _byIng: { name: ing.catalog_name ?? ing.name, amount: ingAmount, unit: ingUnit },
      })
      return
    }

    const reqSize = planMode === 'volume' ? Number(targetSize) : totalOz
    const reqUnit = planMode === 'volume' ? targetUnit : 'oz'
    if (!reqSize || reqSize <= 0) return
    setLoading(true)
    try {
      const result = await api.planBatch({ recipe_id: recipeId, target_size: reqSize, target_unit: reqUnit })
      setPlan(result)
    } finally {
      setLoading(false)
    }
  }

  const displayUnit = planMode === 'ingredient'
    ? (TO_ML[ingUnit] ? ingUnit : 'oz')
    : planMode === 'volume' ? targetUnit : 'oz'

  // Compute total scaled volume (ml) for ingredient mode — used for "Proceed" batch size
  const scaledTotalMl = (planMode === 'ingredient' && plan)
    ? plan.ingredients.reduce((sum, ing) => {
        const u = ing.catalog_unit ?? ing.unit
        return TO_ML[u] ? sum + (ing.scaled_amount ?? 0) * TO_ML[u] : sum
      }, 0)
    : null

  return (
    <div className="form-panel">
      <h3 style={{ marginBottom: 4 }}>Batch Planner</h3>
      <p className="text-muted text-sm" style={{ marginBottom: 12 }}>Scale recipe ingredients to your target output.</p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, width: 'fit-content' }}>
        {[['volume', 'By Volume'], ['cubes', 'By Cubes'], ['ingredient', 'By Ingredient']].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => switchMode(val)}
            style={{
              padding: '5px 14px', fontSize: 13, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: planMode === val ? 'var(--accent)' : 'transparent',
              color: planMode === val ? '#fff' : 'var(--text-secondary)',
              fontWeight: planMode === val ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handlePlan}>
        <div className="form-row three-col">
          <Field label="Recipe *">
            <select required value={recipeId} onChange={e => { setRecipeId(e.target.value); resetPlan() }}>
              <option value="">— select recipe —</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>)}
            </select>
          </Field>

          {planMode === 'volume' && (
            <>
              <Field label="Target Output">
                <input required type="number" step="0.1" min="0.1" value={targetSize} onChange={e => { setTargetSize(e.target.value); resetPlan() }} placeholder="5.0" />
              </Field>
              <Field label="Unit">
                <select value={targetUnit} onChange={e => setTargetUnit(e.target.value)}>
                  {['L', 'ml', 'gal', 'oz', 'cup'].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </>
          )}

          {planMode === 'cubes' && (
            <>
              <Field label="Cube Size (fl oz)">
                <input required type="number" step="0.25" min="0.25" value={cubeSize} onChange={e => { setCubeSize(e.target.value); resetPlan() }} placeholder="2.0" />
              </Field>
              <Field label="Number of Cubes">
                <input required type="number" step="1" min="1" value={numCubes} onChange={e => { setNumCubes(e.target.value); resetPlan() }} placeholder="9" />
              </Field>
            </>
          )}
        </div>

        {/* By Ingredient — ingredient picker + amount on hand */}
        {planMode === 'ingredient' && (
          <div>
            {!recipeId && (
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Select a recipe to see its ingredients.</p>
            )}
            {recipeId && ingLoading && (
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Loading ingredients…</p>
            )}
            {recipeId && !ingLoading && basePlan && (
              <div className="form-row two-col" style={{ marginBottom: 0 }}>
                <Field label="Limiting Ingredient *">
                  <select required value={selectedIngId} onChange={e => { setSelectedIngId(e.target.value); setIngAmount(''); resetPlan() }}>
                    <option value="">— what do you have on hand? —</option>
                    {basePlan.ingredients.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.catalog_name ?? i.name}
                        {i.amount ? ` (recipe: ${i.amount} ${i.catalog_unit ?? i.unit})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
            {selectedIngId && !ingLoading && (
              <div className="form-row two-col" style={{ marginTop: 12 }}>
                <Field label="Amount on Hand *">
                  <input
                    required
                    type="number" step="0.01" min="0.01"
                    value={ingAmount}
                    onChange={e => { setIngAmount(e.target.value); resetPlan() }}
                    placeholder={ingNativeUnit === 'tsp' ? '0.5' : '16'}
                  />
                </Field>
                <Field label="Unit">
                  <select value={ingUnit} onChange={e => { setIngUnit(e.target.value); resetPlan() }}>
                    {compatibleUnits.map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {selectedIng && ingNativeUnit && ingAmount && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 4 }}>
                {(() => {
                  const inNative = convertToUnit(Number(ingAmount), ingUnit, ingNativeUnit)
                  if (inNative == null) return null
                  const sf = inNative / selectedIng.amount
                  return (
                    <span>
                      Scale factor: <strong style={{ color: 'var(--accent)' }}>{Math.round(sf * 100) / 100}×</strong>
                      {' '}({formatAmt(inNative)} {ingNativeUnit} ÷ {selectedIng.amount} {ingNativeUnit} recipe baseline)
                    </span>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {planMode === 'cubes' && totalOz != null && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Total batch volume: <strong style={{ color: 'var(--accent)' }}>{totalOz} oz</strong>
            {' '}({Math.round(totalOz * 29.5735)} ml)
          </div>
        )}

        <div className="flex gap-8" style={{ marginTop: 16 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || (planMode === 'ingredient' && (!selectedIngId || !ingAmount || ingLoading))}
          >
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>

      {plan && (() => {
        const isVanillaBean = ing => {
          const name = (ing.catalog_name ?? ing.name ?? '').toLowerCase()
          const unit = ing.catalog_unit ?? ing.unit
          return name.includes('vanilla') && unit === 'unit'
        }
        const isVanillaInfusionWater = ing => {
          const name = (ing.catalog_name ?? ing.name ?? '').toLowerCase()
          return name.includes('vanilla') && name.includes('water')
        }
        const planHasVanillaBeans = plan.ingredients.some(isVanillaBean)

        return (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
            {planMode === 'ingredient'
              ? <>Scaled to <span style={{ color: 'var(--accent)' }}>{ingAmount} {ingUnit}</span> of {plan._byIng?.name}</>
              : planMode === 'cubes'
              ? `Scaled for ${numCubes} × ${cubeSize} oz cubes (${totalOz} oz total)`
              : `Scaled for ${targetSize} ${targetUnit}`}
            <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 8 }}>
              (scale factor: {Math.round(plan.scale_factor * 100) / 100}×)
            </span>
          </div>

          {planMode === 'ingredient' && scaledTotalMl > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Estimated total batch volume:{' '}
              <strong style={{ color: 'var(--accent)' }}>{Math.round(scaledTotalMl)} ml</strong>
              {' '}({formatAmt(scaledTotalMl / 29.5735)} oz)
            </div>
          )}

          {planHasVanillaBeans && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={useExtract}
                  onChange={e => setUseExtract(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Use vanilla extract instead of vanilla bean</span>
              </label>
              <span className="text-muted" style={{ fontSize: 12 }}>1 bean = 1 tsp pure vanilla extract</span>
            </div>
          )}

          {useExtract && planHasVanillaBeans && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(var(--accent-rgb, 245,158,11), 0.08)', border: '1px solid rgba(var(--accent-rgb, 245,158,11), 0.25)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>Extract note:</strong> Skip the vanilla bean infusion step. Add pure vanilla extract directly to the blend before final Brix measurement. The hot water infusion step is not required.
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ingredient', `Original (${displayUnit})`, `Scaled (${displayUnit})`].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)', paddingBottom: 6, paddingRight: 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.ingredients.map(ing => {
                if (useExtract && isVanillaInfusionWater(ing)) return null
                const origUnit = ing.catalog_unit ?? ing.unit
                let ingName = ing.catalog_name ?? ing.name
                let origDisplay, scaledDisplay
                if (useExtract && isVanillaBean(ing)) {
                  ingName = 'Pure vanilla extract'
                  origDisplay = `${formatAmt(ing.amount)} tsp`
                  scaledDisplay = `${formatAmt(ing.scaled_amount)} tsp`
                } else {
                  const origConverted = convertVolume(ing.amount, origUnit, displayUnit)
                  const scaledConverted = convertVolume(ing.scaled_amount, origUnit, displayUnit)
                  origDisplay = origConverted != null ? `${formatAmt(origConverted)} ${displayUnit}` : `${ing.amount} ${origUnit}`
                  scaledDisplay = scaledConverted != null ? `${formatAmt(scaledConverted)} ${displayUnit}` : `${formatAmt(ing.scaled_amount)} ${origUnit}`
                }
                const isConstraintIng = planMode === 'ingredient' && ing.id === selectedIngId
                return (
                  <tr key={ing.id} style={isConstraintIng ? { background: 'var(--accent-light)' } : undefined}>
                    <td style={{ paddingRight: 16, paddingBottom: 4 }}>
                      {ingName}
                      {isConstraintIng && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>on hand</span>}
                    </td>
                    <td style={{ paddingRight: 16, paddingBottom: 4, color: 'var(--text-secondary)' }}>{origDisplay}</td>
                    <td style={{ paddingBottom: 4, fontWeight: 700 }}>{scaledDisplay}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {(() => { const r = recipes.find(r => r.id === recipeId); return r?.recipe_body ? (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: 'var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)' }}>Instructions</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: scaledInstructions ? 'var(--accent)' : 'var(--text-secondary)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={scaledInstructions}
                    onChange={e => setScaledInstructions(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  Scale amounts
                </label>
              </div>
              <div className="recipe-body" dangerouslySetInnerHTML={{ __html: scaledInstructions ? scaleRecipeBody(r.recipe_body, plan.scale_factor) : r.recipe_body }} />
            </div>
          ) : null })()}

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => {
              let sz, un
              if (planMode === 'ingredient') {
                sz = scaledTotalMl ? Math.round(scaledTotalMl) : 0
                un = 'ml'
              } else if (planMode === 'volume') {
                sz = targetSize; un = targetUnit
              } else {
                sz = totalOz; un = 'oz'
              }
              onProceed(recipeId, sz, un)
            }}
          >
            Proceed to Log Batch →
          </button>
        </div>
        )
      })()}
    </div>
  )
}

function BatchForm({ recipes, initial, initialRecipeId, initialSize, initialUnit, onSave, onCancel }) {
  const isEditing = !!initial
  const [form, setForm] = useState(() => initial ? {
    recipe_id: initial.recipe_id ?? '',
    batch_id: initial.batch_id ?? '',
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    batch_size: initial.batch_size ?? '',
    batch_unit: initial.batch_unit ?? 'L',
    start_time: initial.start_time ?? '',
    end_time: initial.end_time ?? '',
    observed_brix: initial.observed_brix ?? '',
    observed_ph: initial.observed_ph ?? '',
    color: initial.color ?? '',
    notes: initial.notes ?? '',
  } : {
    recipe_id: initialRecipeId ?? '',
    batch_id: '', date: new Date().toISOString().slice(0, 10),
    batch_size: initialSize ?? '', batch_unit: initialUnit ?? 'L',
    start_time: '', end_time: '',
    observed_brix: '', observed_ph: '', color: '', notes: ''
  })
  const [showBrixAdj, setShowBrixAdj] = useState(false)
  const [batchIdLocked, setBatchIdLocked] = useState(isEditing)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedRecipe = recipes.find(r => r.id === form.recipe_id)

  // Auto-generate batch ID when recipe or date changes (unless user manually edited it)
  useEffect(() => {
    if (!form.recipe_id || batchIdLocked) return
    api.getNextBatchId(form.recipe_id, form.date)
      .then(({ batch_id }) => setForm(f => ({ ...f, batch_id })))
      .catch(() => {})
  }, [form.recipe_id, form.date])

  const brixOutOfRange = selectedRecipe && form.observed_brix !== '' &&
    (Number(form.observed_brix) < selectedRecipe.brix_min || Number(form.observed_brix) > selectedRecipe.brix_max)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      batch_size: form.batch_size === '' ? null : Number(form.batch_size),
      observed_brix: form.observed_brix === '' ? null : Number(form.observed_brix),
      observed_ph: form.observed_ph === '' ? null : Number(form.observed_ph),
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{isEditing ? 'Edit Batch' : 'Log Batch'}</h3>

      <div className="form-row three-col">
        <Field label="Recipe *">
          <select required value={form.recipe_id} onChange={e => set('recipe_id', e.target.value)}>
            <option value="">— select recipe —</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.sku} – {r.expression}</option>
            ))}
          </select>
        </Field>
        <Field label="Batch ID (auto)">
          <input
            value={form.batch_id}
            onChange={e => { set('batch_id', e.target.value); setBatchIdLocked(true) }}
            placeholder="Auto-generated on recipe select"
          />
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
      </div>

      {selectedRecipe && (
        <div style={{ background: 'var(--accent-light)', border: '0.5px solid #c6d9b0', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Targets: </span>
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>
            Brix {selectedRecipe.brix_min}–{selectedRecipe.brix_max} °Bx &nbsp;|&nbsp; pH {selectedRecipe.ph_min}–{selectedRecipe.ph_max}
          </span>
        </div>
      )}

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label={`Observed Brix${selectedRecipe?.brix_min != null ? ` (${selectedRecipe.brix_min}–${selectedRecipe.brix_max})` : ''}`}>
          <input type="number" step="0.1" value={form.observed_brix} onChange={e => { set('observed_brix', e.target.value); setShowBrixAdj(false) }} placeholder="21.0" />
        </Field>
        <Field label={`Observed pH${selectedRecipe?.ph_min != null ? ` (${selectedRecipe.ph_min}–${selectedRecipe.ph_max})` : ''}`}>
          <input type="number" step="0.01" value={form.observed_ph} onChange={e => set('observed_ph', e.target.value)} placeholder="2.7" />
        </Field>
        <Field label="Total Output">
          <input type="number" step="0.1" value={form.batch_size} onChange={e => set('batch_size', e.target.value)} placeholder="5.0" />
        </Field>
        <Field label="Units">
          <select value={form.batch_unit} onChange={e => set('batch_unit', e.target.value)}>
            {['L', 'ml', 'gal', 'oz', 'unit'].map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      {brixOutOfRange && !showBrixAdj && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-sm" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '0.5px solid var(--amber)' }}
            onClick={() => setShowBrixAdj(true)}>
            Brix out of range — view adjustment guide
          </button>
        </div>
      )}
      {showBrixAdj && selectedRecipe && (
        <BrixAdjustDialog
          observed={Number(form.observed_brix)}
          target_min={selectedRecipe.brix_min}
          target_max={selectedRecipe.brix_max}
          batch_size={form.batch_size ? Number(form.batch_size) : null}
          batch_unit={form.batch_unit}
          onClose={() => setShowBrixAdj(false)}
        />
      )}

      <div className="form-row three-col">
        <Field label="Start Time">
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
        </Field>
        <Field label="End Time">
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </Field>
        <Field label="Color">
          <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Pale amber" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Process notes…" />
      </Field>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{isEditing ? 'Save changes' : 'Log batch'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function BatchCard({ batch, onEdit, onDelete }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{batch.batch_id || <span className="text-muted">No ID</span>}</span>
          <span className="text-sm text-muted">{batch.sku} – {batch.expression}</span>
          {batch.date && <span className="text-sm text-muted">{batch.date}</span>}
        </div>
        <div className="flex gap-8">
          <button className="btn btn-sm" onClick={() => onEdit(batch)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(batch.id)}>Delete</button>
        </div>
      </div>
      <div className="card-body">
        <div className="targets">
          <div className="target-item">
            <span className="target-label">Brix</span>
            <span className="target-value" style={{ fontWeight: 600 }}>
              {brixIndicator(batch.observed_brix, batch.brix_min, batch.brix_max) ?? <span className="text-muted">—</span>}
              {batch.brix_min != null && (
                <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (target {batch.brix_min}–{batch.brix_max})
                </span>
              )}
            </span>
          </div>
          <div className="target-item">
            <span className="target-label">pH</span>
            <span className="target-value">
              {phIndicator(batch.observed_ph, batch.ph_min, batch.ph_max) ?? <span className="text-muted">—</span>}
              {batch.ph_min != null && (
                <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (target {batch.ph_min}–{batch.ph_max})
                </span>
              )}
            </span>
          </div>
          {batch.batch_size && (
            <div className="target-item">
              <span className="target-label">Size</span>
              <span className="target-value">{batch.batch_size} {batch.batch_unit}</span>
            </div>
          )}
          {batch.color && (
            <div className="target-item">
              <span className="target-label">Color</span>
              <span className="target-value">{batch.color}</span>
            </div>
          )}
          {(batch.start_time || batch.end_time) && (
            <div className="target-item">
              <span className="target-label">Time</span>
              <span className="target-value">{batch.start_time || '?'} – {batch.end_time || '?'}</span>
            </div>
          )}
        </div>
        {(batch.brix_min != null && batch.observed_brix != null) || (batch.ph_min != null && batch.observed_ph != null) ? (
          <div style={{ marginTop: 12 }}>
            <RangeViz label="Brix" min={batch.brix_min} max={batch.brix_max} value={batch.observed_brix} unit=" °Bx" />
            <RangeViz label="pH" min={batch.ph_min} max={batch.ph_max} value={batch.observed_ph} />
          </div>
        ) : null}
        {batch.notes && <p className="text-sm text-muted" style={{ marginTop: 8 }}>{batch.notes}</p>}
      </div>
    </div>
  )
}

export default function BatchesView({ initRecipeId, onClearInit }) {
  const [batches, setBatches] = useState([])
  const [recipes, setRecipes] = useState([])
  const [mode, setMode] = useState('none') // 'none' | 'plan' | 'log'
  const [planResult, setPlanResult] = useState(null)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([api.getBatches(), api.getRecipes()])
    .then(([b, r]) => { setBatches(b); setRecipes(r) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (initRecipeId) setMode('plan')
  }, [initRecipeId])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateBatch(editing.id, payload)
      setEditing(null)
    } else {
      await api.createBatch(payload)
      setMode('none')
      setPlanResult(null)
    }
    load()
  }

  const handleEdit = (batch) => {
    setEditing(batch)
    setMode('none')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch?')) return
    await api.deleteBatch(id)
    load()
  }

  const handlePlanProceed = (recipeId, size, unit) => {
    setPlanResult({ recipeId, size, unit })
    setMode('log')
  }

  const handleCancel = () => { setMode('none'); setPlanResult(null); onClearInit?.() }

  return (
    <div>
      <SectionHeader
        title="Batches"
        action={
          <div className="flex gap-8">
            <button
              className={`form-toggle-btn${mode === 'plan' ? ' open' : ''}`}
              onClick={() => setMode(m => m === 'plan' ? 'none' : 'plan')}
            >
              {mode === 'plan' ? '✕ Cancel' : 'Batch Planner'}
            </button>
            <button
              className={`form-toggle-btn${mode === 'log' ? ' open' : ''}`}
              onClick={() => setMode(m => m === 'log' ? 'none' : 'log')}
            >
              {mode === 'log' ? '✕ Cancel' : '+ Log Batch'}
            </button>
          </div>
        }
      />

      {mode === 'plan' && (
        <BatchPlanner
          key={initRecipeId ?? 'manual'}
          recipes={recipes}
          initialRecipeId={initRecipeId}
          onProceed={(recipeId, sz, un) => { onClearInit?.(); handlePlanProceed(recipeId, sz, un) }}
          onCancel={handleCancel}
        />
      )}

      {mode === 'log' && (
        <BatchForm
          recipes={recipes}
          initialRecipeId={planResult?.recipeId}
          initialSize={planResult?.size}
          initialUnit={planResult?.unit}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {editing && (
        <BatchForm
          recipes={recipes}
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading
        ? <div className="empty-state"><p>Loading…</p></div>
        : batches.length === 0
          ? <div className="empty-state"><p>No batches logged yet.</p></div>
          : (
            <div className="card-list">
              {batches.map(b => <BatchCard key={b.id} batch={b} onEdit={handleEdit} onDelete={handleDelete} />)}
            </div>
          )
      }
    </div>
  )
}
