import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute(`
    SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
    FROM batches b
    LEFT JOIN recipes r ON r.id = b.recipe_id
    ORDER BY b.created_at DESC
  `)
  res.json(result.rows)
})

router.get('/next-id', async (req, res) => {
  const { recipe_id, date } = req.query
  if (!recipe_id) return res.status(400).json({ error: 'recipe_id required' })
  const recipeResult = await client.execute({ sql: 'SELECT sku FROM recipes WHERE id = ?', args: [recipe_id] })
  const recipe = recipeResult.rows[0]
  const dateStr = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const countResult = await client.execute({ sql: 'SELECT COUNT(*) as c FROM batches WHERE recipe_id = ?', args: [recipe_id] })
  const seq = String((Number(countResult.rows[0]?.c) ?? 0) + 1).padStart(3, '0')
  res.json({ batch_id: `${recipe?.sku ?? 'BLM'}-${dateStr}-${seq}` })
})

router.post('/plan', async (req, res) => {
  const { recipe_id, target_size, target_unit } = req.body
  if (!recipe_id || !target_size) return res.status(400).json({ error: 'recipe_id and target_size required' })

  const result = await client.execute({
    sql: `SELECT i.*, ic.cost_per_unit, ic.name as catalog_name, ic.unit as catalog_unit
          FROM ingredients i
          LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
          WHERE i.recipe_id = ?
          ORDER BY i.sort_order`,
    args: [recipe_id]
  })
  const ingredients = result.rows

  const TO_ML = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 }
  const targetMl = (TO_ML[target_unit] ?? 1) * target_size
  const totalVolumeMl = ingredients.reduce((sum, i) => {
    const unit = i.catalog_unit ?? i.unit
    const factor = TO_ML[unit]
    return factor != null ? sum + (i.amount ?? 0) * factor : sum
  }, 0)
  const scaleFactor = totalVolumeMl > 0 ? targetMl / totalVolumeMl : 1
  const scaled = ingredients.map(i => ({ ...i, scaled_amount: Math.round(i.amount * scaleFactor * 1000) / 1000 }))
  res.json({ ingredients: scaled, scale_factor: Math.round(scaleFactor * 1000) / 1000, total_volume: totalVolumeMl, target_unit })
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  let { recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes } = req.body

  if (!batch_id) {
    const recipeResult = await client.execute({ sql: 'SELECT sku FROM recipes WHERE id = ?', args: [recipe_id] })
    const recipe = recipeResult.rows[0]
    const dateStr = (date || now.slice(0, 10)).replace(/-/g, '')
    const countResult = await client.execute({ sql: 'SELECT COUNT(*) as c FROM batches WHERE recipe_id = ?', args: [recipe_id] })
    const seq = String((Number(countResult.rows[0]?.c) ?? 0) + 1).padStart(3, '0')
    batch_id = `${recipe?.sku ?? 'BLM'}-${dateStr}-${seq}`
  }

  await client.execute({
    sql: `INSERT INTO batches (id, recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, recipe_id, batch_id, date, batch_size, batch_unit, start_time ?? null, end_time ?? null, observed_brix, observed_ph, color ?? null, notes, now]
  })

  const batch = await client.execute({
    sql: `SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
          FROM batches b LEFT JOIN recipes r ON r.id = b.recipe_id WHERE b.id = ?`,
    args: [id]
  })
  res.status(201).json(batch.rows[0])
})

router.put('/:id', async (req, res) => {
  const { recipe_id, batch_id, date, batch_size, batch_unit, start_time, end_time, observed_brix, observed_ph, color, notes } = req.body
  await client.execute({
    sql: `UPDATE batches
          SET recipe_id=?, batch_id=?, date=?, batch_size=?, batch_unit=?,
              start_time=?, end_time=?, observed_brix=?, observed_ph=?, color=?, notes=?
          WHERE id=?`,
    args: [recipe_id, batch_id, date, batch_size ?? null, batch_unit,
      start_time ?? null, end_time ?? null, observed_brix ?? null, observed_ph ?? null,
      color ?? null, notes ?? null, req.params.id]
  })
  const batch = await client.execute({
    sql: `SELECT b.*, r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
          FROM batches b LEFT JOIN recipes r ON r.id = b.recipe_id WHERE b.id = ?`,
    args: [req.params.id]
  })
  res.json(batch.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM batches WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
