import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM ingredients_catalog ORDER BY name').all()
  res.json(items)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { name, unit, cost_per_unit, notes } = req.body
  db.prepare(`
    INSERT INTO ingredients_catalog (id, name, unit, cost_per_unit, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, unit, cost_per_unit ?? null, notes ?? null, now)
  res.status(201).json(db.prepare('SELECT * FROM ingredients_catalog WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const { name, unit, cost_per_unit, notes } = req.body
  db.prepare(`
    UPDATE ingredients_catalog SET name=?, unit=?, cost_per_unit=?, notes=? WHERE id=?
  `).run(name, unit, cost_per_unit ?? null, notes ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM ingredients_catalog WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ingredients_catalog WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
