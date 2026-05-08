import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute('SELECT * FROM recipes ORDER BY created_at DESC')
  res.json(result.rows)
})

router.get('/:id', async (req, res) => {
  const result = await client.execute({ sql: 'SELECT * FROM recipes WHERE id = ?', args: [req.params.id] })
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(result.rows[0])
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, ingredients } = req.body

  const stmts = [
    {
      sql: `INSERT INTO recipes (id, sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, sku, expression, version, status ?? 'active', brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body ?? null, parent_id ?? null, now]
    }
  ]
  if (Array.isArray(ingredients)) {
    ingredients.forEach((ing, idx) => {
      stmts.push({
        sql: `INSERT INTO ingredients (id, recipe_id, catalog_id, name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), id, ing.catalog_id ?? null, ing.name, ing.amount, ing.unit, idx]
      })
    })
  }
  await client.batch(stmts, 'write')

  const recipe = await client.execute({ sql: 'SELECT * FROM recipes WHERE id = ?', args: [id] })
  res.status(201).json(recipe.rows[0])
})

router.put('/:id', async (req, res) => {
  const { sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, ingredients } = req.body

  const stmts = [
    {
      sql: `UPDATE recipes SET sku=?, expression=?, version=?, status=?, brix_min=?, brix_max=?, ph_min=?, ph_max=?, melt_min=?, melt_max=?, notes=?, recipe_body=?, parent_id=? WHERE id=?`,
      args: [sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body ?? null, parent_id ?? null, req.params.id]
    }
  ]
  if (Array.isArray(ingredients)) {
    stmts.push({ sql: 'DELETE FROM ingredients WHERE recipe_id = ?', args: [req.params.id] })
    ingredients.forEach((ing, idx) => {
      stmts.push({
        sql: `INSERT INTO ingredients (id, recipe_id, catalog_id, name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), req.params.id, ing.catalog_id ?? null, ing.name, ing.amount, ing.unit, idx]
      })
    })
  }
  await client.batch(stmts, 'write')

  const recipe = await client.execute({ sql: 'SELECT * FROM recipes WHERE id = ?', args: [req.params.id] })
  res.json(recipe.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM recipes WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

router.get('/:id/ingredients', async (req, res) => {
  const result = await client.execute({
    sql: `SELECT i.*, ic.cost_per_unit, ic.name as catalog_name
          FROM ingredients i
          LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
          WHERE i.recipe_id = ?
          ORDER BY i.sort_order`,
    args: [req.params.id]
  })
  res.json(result.rows)
})

router.get('/:id/cost', async (req, res) => {
  const result = await client.execute({
    sql: `SELECT i.amount, i.unit, ic.cost_per_unit, ic.unit as catalog_unit
          FROM ingredients i
          LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
          WHERE i.recipe_id = ?`,
    args: [req.params.id]
  })
  const rows = result.rows

  let total = null
  if (rows.length > 0 && rows.every(r => r.cost_per_unit != null)) {
    total = rows.reduce((sum, r) => sum + (r.amount * r.cost_per_unit), 0)
  } else if (rows.some(r => r.cost_per_unit != null)) {
    total = rows.reduce((sum, r) => sum + (r.cost_per_unit != null ? r.amount * r.cost_per_unit : 0), 0)
  }

  res.json({ total, partial: rows.some(r => r.cost_per_unit == null) })
})

router.get('/:id/batches', async (req, res) => {
  const result = await client.execute({
    sql: `SELECT id, batch_id, date, observed_brix, observed_ph, batch_size, batch_unit
          FROM batches WHERE recipe_id = ? ORDER BY date DESC`,
    args: [req.params.id]
  })
  res.json(result.rows)
})

router.get('/:id/stats', async (req, res) => {
  const result = await client.execute({
    sql: `SELECT
            COUNT(DISTINCT b.id)                                                         AS batch_count,
            MAX(b.date)                                                                  AS last_batch_date,
            AVG(b.observed_brix)                                                         AS avg_brix,
            COUNT(bc.id)                                                                 AS cubes_created,
            SUM(CASE WHEN bc.tasting_id IS NOT NULL THEN 1 ELSE 0 END)                  AS cubes_tested,
            SUM(CASE WHEN bc.status = 'frozen' AND bc.tasting_id IS NULL THEN 1 ELSE 0 END) AS cubes_inventory
          FROM batches b
          LEFT JOIN batch_cubes bc ON bc.batch_id = b.id
          WHERE b.recipe_id = ?`,
    args: [req.params.id]
  })
  const row = result.rows[0]
  res.json({
    batch_count:     Number(row.batch_count) ?? 0,
    last_batch_date: row.last_batch_date ?? null,
    avg_brix:        row.avg_brix != null ? Math.round(Number(row.avg_brix) * 10) / 10 : null,
    cubes_created:   Number(row.cubes_created) ?? 0,
    cubes_tested:    Number(row.cubes_tested) ?? 0,
    cubes_inventory: Number(row.cubes_inventory) ?? 0,
  })
})

export default router
