import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const recipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all()
  res.json(recipes)
})

router.get('/:id', (req, res) => {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id)
  if (!recipe) return res.status(404).json({ error: 'Not found' })
  res.json(recipe)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, ingredients } = req.body

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (id, sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (id, recipe_id, catalog_id, name, amount, unit, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const create = db.transaction(() => {
    insertRecipe.run(id, sku, expression, version, status ?? 'active', brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body ?? null, parent_id ?? null, now)
    if (Array.isArray(ingredients)) {
      ingredients.forEach((ing, idx) => {
        insertIngredient.run(randomUUID(), id, ing.catalog_id ?? null, ing.name, ing.amount, ing.unit, idx)
      })
    }
  })
  create()

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id)
  res.status(201).json(recipe)
})

router.put('/:id', (req, res) => {
  const { sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body, parent_id, ingredients } = req.body

  const update = db.prepare(`
    UPDATE recipes SET sku=?, expression=?, version=?, status=?, brix_min=?, brix_max=?, ph_min=?, ph_max=?, melt_min=?, melt_max=?, notes=?, recipe_body=?, parent_id=?
    WHERE id=?
  `)
  const deleteIngredients = db.prepare('DELETE FROM ingredients WHERE recipe_id = ?')
  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (id, recipe_id, catalog_id, name, amount, unit, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const save = db.transaction(() => {
    update.run(sku, expression, version, status, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, notes, recipe_body ?? null, parent_id ?? null, req.params.id)
    if (Array.isArray(ingredients)) {
      deleteIngredients.run(req.params.id)
      ingredients.forEach((ing, idx) => {
        insertIngredient.run(randomUUID(), req.params.id, ing.catalog_id ?? null, ing.name, ing.amount, ing.unit, idx)
      })
    }
  })
  save()

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id)
  res.json(recipe)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// GET ingredients with catalog cost info
router.get('/:id/ingredients', (req, res) => {
  const ingredients = db.prepare(`
    SELECT i.*, ic.cost_per_unit, ic.name as catalog_name
    FROM ingredients i
    LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
    WHERE i.recipe_id = ?
    ORDER BY i.sort_order
  `).all(req.params.id)
  res.json(ingredients)
})

// GET total cost for a recipe (based on ingredient catalog costs)
router.get('/:id/cost', (req, res) => {
  const rows = db.prepare(`
    SELECT i.amount, i.unit, ic.cost_per_unit, ic.unit as catalog_unit
    FROM ingredients i
    LEFT JOIN ingredients_catalog ic ON ic.id = i.catalog_id
    WHERE i.recipe_id = ?
  `).all(req.params.id)

  let total = null
  const hasAllCosts = rows.length > 0 && rows.every(r => r.cost_per_unit != null)
  if (hasAllCosts) {
    total = rows.reduce((sum, r) => sum + (r.amount * r.cost_per_unit), 0)
  } else if (rows.some(r => r.cost_per_unit != null)) {
    total = rows.reduce((sum, r) => sum + (r.cost_per_unit != null ? r.amount * r.cost_per_unit : 0), 0)
  }

  res.json({ total, partial: rows.some(r => r.cost_per_unit == null) })
})

// GET batches for brix/pH viz
router.get('/:id/batches', (req, res) => {
  const batches = db.prepare(`
    SELECT id, batch_id, date, observed_brix, observed_ph, batch_size, batch_unit
    FROM batches WHERE recipe_id = ? ORDER BY date DESC
  `).all(req.params.id)
  res.json(batches)
})

// GET summary stats for recipe card
router.get('/:id/stats', (req, res) => {
  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT b.id)                                                         AS batch_count,
      MAX(b.date)                                                                  AS last_batch_date,
      AVG(b.observed_brix)                                                         AS avg_brix,
      COUNT(bc.id)                                                                 AS cubes_created,
      SUM(CASE WHEN bc.tasting_id IS NOT NULL THEN 1 ELSE 0 END)                  AS cubes_tested,
      SUM(CASE WHEN bc.status = 'frozen' AND bc.tasting_id IS NULL THEN 1 ELSE 0 END) AS cubes_inventory
    FROM batches b
    LEFT JOIN batch_cubes bc ON bc.batch_id = b.id
    WHERE b.recipe_id = ?
  `).get(req.params.id)
  res.json({
    batch_count:     row.batch_count ?? 0,
    last_batch_date: row.last_batch_date ?? null,
    avg_brix:        row.avg_brix != null ? Math.round(row.avg_brix * 10) / 10 : null,
    cubes_created:   row.cubes_created ?? 0,
    cubes_tested:    row.cubes_tested ?? 0,
    cubes_inventory: row.cubes_inventory ?? 0,
  })
})

export default router
