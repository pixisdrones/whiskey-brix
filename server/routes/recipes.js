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
  const { sku, expression, version, status, spirit_pairing, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, mold_type, notes, parent_id, ingredients } = req.body

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (id, sku, expression, version, status, spirit_pairing, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, mold_type, notes, parent_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (id, recipe_id, name, brand, amount, unit, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const create = db.transaction(() => {
    insertRecipe.run(id, sku, expression, version, status ?? 'active', spirit_pairing, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, mold_type, notes, parent_id, now)
    if (Array.isArray(ingredients)) {
      ingredients.forEach((ing, idx) => {
        insertIngredient.run(randomUUID(), id, ing.name, ing.brand ?? null, ing.amount, ing.unit, idx)
      })
    }
  })
  create()

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id)
  res.status(201).json(recipe)
})

router.put('/:id', (req, res) => {
  const { sku, expression, version, status, spirit_pairing, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, mold_type, notes, parent_id, ingredients } = req.body

  const update = db.prepare(`
    UPDATE recipes SET sku=?, expression=?, version=?, status=?, spirit_pairing=?, brix_min=?, brix_max=?, ph_min=?, ph_max=?, melt_min=?, melt_max=?, mold_type=?, notes=?, parent_id=?
    WHERE id=?
  `)
  const deleteIngredients = db.prepare('DELETE FROM ingredients WHERE recipe_id = ?')
  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (id, recipe_id, name, brand, amount, unit, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const save = db.transaction(() => {
    update.run(sku, expression, version, status, spirit_pairing, brix_min, brix_max, ph_min, ph_max, melt_min, melt_max, mold_type, notes, parent_id, req.params.id)
    if (Array.isArray(ingredients)) {
      deleteIngredients.run(req.params.id)
      ingredients.forEach((ing, idx) => {
        insertIngredient.run(randomUUID(), req.params.id, ing.name, ing.brand ?? null, ing.amount, ing.unit, idx)
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

router.get('/:id/ingredients', (req, res) => {
  const ingredients = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order').all(req.params.id)
  res.json(ingredients)
})

router.post('/:id/ingredients', (req, res) => {
  const id = randomUUID()
  const { name, brand, amount, unit, sort_order } = req.body
  db.prepare('INSERT INTO ingredients (id, recipe_id, name, brand, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.params.id, name, brand ?? null, amount, unit, sort_order ?? 0)
  res.status(201).json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id))
})

export default router
