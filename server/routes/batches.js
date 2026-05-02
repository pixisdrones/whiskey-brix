import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const batches = db.prepare(`
    SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
    FROM batches b
    LEFT JOIN recipes r ON r.id = b.recipe_id
    ORDER BY b.created_at DESC
  `).all()
  res.json(batches)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  let { recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes } = req.body

  // Auto-generate batch_id if not provided
  if (!batch_id) {
    const recipe = db.prepare('SELECT sku FROM recipes WHERE id = ?').get(recipe_id)
    const dateStr = (date || now.slice(0, 10)).replace(/-/g, '')
    const count = db.prepare('SELECT COUNT(*) as c FROM batches WHERE recipe_id = ?').get(recipe_id)?.c ?? 0
    const seq = String(count + 1).padStart(3, '0')
    batch_id = `${recipe?.sku ?? 'BLM'}-${dateStr}-${seq}`
  }

  db.prepare(`
    INSERT INTO batches (id, recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, recipe_id, batch_id, date, batch_size, batch_unit, start_time ?? null, end_time ?? null, observed_brix, observed_ph, color ?? null, notes, now)
  const batch = db.prepare('SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max FROM batches b LEFT JOIN recipes r ON r.id = b.recipe_id WHERE b.id = ?').get(id)
  res.status(201).json(batch)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.put('/:id', (req, res) => {
  const { recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes } = req.body
  db.prepare(`
    UPDATE batches
    SET recipe_id=?, batch_id=?, date=?, batch_size=?, batch_unit=?,
        start_time=?, end_time=?, observed_brix=?, observed_ph=?, color=?, notes=?
    WHERE id=?
  `).run(recipe_id, batch_id, date, batch_size ?? null, batch_unit,
    start_time ?? null, end_time ?? null, observed_brix ?? null, observed_ph ?? null,
    color ?? null, notes ?? null, req.params.id)
  const batch = db.prepare(`
    SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
    FROM batches b LEFT JOIN recipes r ON r.id = b.recipe_id WHERE b.id = ?
  `).get(req.params.id)
  res.json(batch)
})

// GET /api/batches/next-id?recipe_id=...&date=... — preview next auto batch ID
router.get('/next-id', (req, res) => {
  const { recipe_id, date } = req.query
  if (!recipe_id) return res.status(400).json({ error: 'recipe_id required' })
  const recipe = db.prepare('SELECT sku FROM recipes WHERE id = ?').get(recipe_id)
  const dateStr = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const count = db.prepare('SELECT COUNT(*) as c FROM batches WHERE recipe_id = ?').get(recipe_id)?.c ?? 0
  const seq = String(count + 1).padStart(3, '0')
  res.json({ batch_id: `${recipe?.sku ?? 'BLM'}-${dateStr}-${seq}` })
})

// POST /api/batches/plan — scale recipe ingredients for a target output
router.post('/plan', (req, res) => {
  const { recipe_id, target_size, target_unit } = req.body
  if (!recipe_id || !target_size) return res.status(400).json({ error: 'recipe_id and target_size required' })

  const ingredients = db.prepare(`
    SELECT i.*, ic.cost_per_unit, ic.name as catalog_name, ic.unit as catalog_unit
    FROM ingredients i
    LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
    WHERE i.recipe_id = ?
    ORDER BY i.sort_order
  `).all(recipe_id)

  // Unit → ml conversion table (same as frontend TO_ML)
  const TO_ML = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 }

  // Convert target to ml
  const targetMl = (TO_ML[target_unit] ?? 1) * target_size

  // Sum only volume-unit ingredients (converted to ml) to get recipe's total volume baseline
  const totalVolumeMl = ingredients.reduce((sum, i) => {
    const unit = i.catalog_unit ?? i.unit
    const factor = TO_ML[unit]
    return factor != null ? sum + (i.amount ?? 0) * factor : sum
  }, 0)

  // Scale factor: how many times larger the target is vs. the recipe volume
  const scaleFactor = totalVolumeMl > 0 ? targetMl / totalVolumeMl : 1

  const scaled = ingredients.map(i => ({
    ...i,
    scaled_amount: Math.round(i.amount * scaleFactor * 1000) / 1000
  }))

  res.json({ ingredients: scaled, scale_factor: Math.round(scaleFactor * 1000) / 1000, total_volume: totalVolumeMl, target_unit })
})

export default router
