import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const tests = db.prepare(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id,
           r.sku, r.expression, r.melt_min, r.melt_max
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    ORDER BY ft.created_at DESC
  `).all()
  res.json(tests)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { batch_id, date, mold_type, cube_size, freezer_temp, freezer_location, freeze_time, hardness, slush_start, full_melt, separation, notes } = req.body
  db.prepare(`
    INSERT INTO freeze_tests (id, batch_id, date, mold_type, cube_size, freezer_temp, freezer_location, freeze_time, hardness, slush_start, full_melt, separation, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, batch_id, date, mold_type, cube_size, freezer_temp, freezer_location, freeze_time, hardness, slush_start, full_melt, separation ?? 'no', notes, now)
  const test = db.prepare(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression, r.melt_min, r.melt_max
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    WHERE ft.id = ?
  `).get(id)
  res.status(201).json(test)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM freeze_tests WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
