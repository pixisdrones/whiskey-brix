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
  const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = req.body

  // Auto-calculate cost_per_unit from purchase_price / qty_purchased
  let cost_per_unit = null
  if (purchase_price != null && qty_purchased != null && qty_purchased > 0) {
    cost_per_unit = purchase_price / qty_purchased
  }

  db.prepare(`
    INSERT INTO ingredients_catalog (id, name, unit, brand, vendor, qty_purchased, purchase_price, cost_per_unit, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, unit, brand ?? null, vendor ?? null, qty_purchased ?? null, purchase_price ?? null, cost_per_unit, notes ?? null, now)
  res.status(201).json(db.prepare('SELECT * FROM ingredients_catalog WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = req.body

  let cost_per_unit = null
  if (purchase_price != null && qty_purchased != null && qty_purchased > 0) {
    cost_per_unit = purchase_price / qty_purchased
  }

  db.prepare(`
    UPDATE ingredients_catalog SET name=?, unit=?, brand=?, vendor=?, qty_purchased=?, purchase_price=?, cost_per_unit=?, notes=? WHERE id=?
  `).run(name, unit, brand ?? null, vendor ?? null, qty_purchased ?? null, purchase_price ?? null, cost_per_unit, notes ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM ingredients_catalog WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ingredients_catalog WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
