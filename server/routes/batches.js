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
  const { recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes } = req.body
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

// POST /api/batches/plan — scale recipe ingredients for a target output
router.post('/plan', (req, res) => {
  const { recipe_id, target_size, target_unit } = req.body
  if (!recipe_id || !target_size) return res.status(400).json({ error: 'recipe_id and target_size required' })

  const ingredients = db.prepare(`
    SELECT i.*, ic.cost_per_unit
    FROM ingredients i
    LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
    WHERE i.recipe_id = ?
    ORDER BY i.sort_order
  `).all(recipe_id)

  // Sum all ingredient amounts to get total recipe volume
  const totalVolume = ingredients.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  const scaleFactor = totalVolume > 0 ? target_size / totalVolume : 1

  const scaled = ingredients.map(i => ({
    ...i,
    scaled_amount: Math.round(i.amount * scaleFactor * 100) / 100
  }))

  res.json({ ingredients: scaled, scale_factor: scaleFactor, total_volume: totalVolume })
})

export default router
