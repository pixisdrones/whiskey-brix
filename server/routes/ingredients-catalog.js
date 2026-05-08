import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute('SELECT * FROM ingredients_catalog ORDER BY name')
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = req.body

  let cost_per_unit = null
  if (purchase_price != null && qty_purchased != null && qty_purchased > 0) {
    cost_per_unit = purchase_price / qty_purchased
  }

  await client.execute({
    sql: `INSERT INTO ingredients_catalog (id, name, unit, brand, vendor, qty_purchased, purchase_price, cost_per_unit, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, name, unit, brand ?? null, vendor ?? null, qty_purchased ?? null, purchase_price ?? null, cost_per_unit, notes ?? null, now]
  })
  const item = await client.execute({ sql: 'SELECT * FROM ingredients_catalog WHERE id = ?', args: [id] })
  res.status(201).json(item.rows[0])
})

router.put('/:id', async (req, res) => {
  const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = req.body

  let cost_per_unit = null
  if (purchase_price != null && qty_purchased != null && qty_purchased > 0) {
    cost_per_unit = purchase_price / qty_purchased
  }

  await client.execute({
    sql: `UPDATE ingredients_catalog SET name=?, unit=?, brand=?, vendor=?, qty_purchased=?, purchase_price=?, cost_per_unit=?, notes=? WHERE id=?`,
    args: [name, unit, brand ?? null, vendor ?? null, qty_purchased ?? null, purchase_price ?? null, cost_per_unit, notes ?? null, req.params.id]
  })
  const item = await client.execute({ sql: 'SELECT * FROM ingredients_catalog WHERE id = ?', args: [req.params.id] })
  res.json(item.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM ingredients_catalog WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
