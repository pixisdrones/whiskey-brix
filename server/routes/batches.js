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
  `).run(id, recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes, now)
  const batch = db.prepare('SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max FROM batches b LEFT JOIN recipes r ON r.id = b.recipe_id WHERE b.id = ?').get(id)
  res.status(201).json(batch)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
