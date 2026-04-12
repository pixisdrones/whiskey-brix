import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const tastings = db.prepare(`
    SELECT t.*,
           b.batch_id as batch_label, b.recipe_id,
           r.sku, r.expression
    FROM tastings t
    LEFT JOIN batches b ON b.id = t.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    ORDER BY t.created_at DESC
  `).all()

  const result = tastings.map(tasting => {
    const timepoints = db.prepare('SELECT * FROM tasting_timepoints WHERE tasting_id = ? ORDER BY phase').all(tasting.id)
    return { ...tasting, timepoints }
  })
  res.json(result)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const {
    batch_id, freeze_test_id, date, taster, spirit_type, spirit_brand,
    spirit_integration, melt_timing, ritual_satisfaction, overall_score,
    recommended_revision, timepoints
  } = req.body

  const insertTasting = db.prepare(`
    INSERT INTO tastings (id, batch_id, freeze_test_id, date, taster, spirit_type, spirit_brand,
      spirit_integration, melt_timing, ritual_satisfaction, overall_score, recommended_revision, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTimepoint = db.prepare(`
    INSERT INTO tasting_timepoints (id, tasting_id, phase, aroma_intensity, sweetness, acidity, body, flavor_descriptors, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const create = db.transaction(() => {
    insertTasting.run(id, batch_id, freeze_test_id ?? null, date, taster, spirit_type, spirit_brand,
      spirit_integration, melt_timing, ritual_satisfaction, overall_score, recommended_revision, now)
    if (Array.isArray(timepoints)) {
      timepoints.forEach(tp => {
        insertTimepoint.run(
          randomUUID(), id, tp.phase,
          tp.aroma_intensity, tp.sweetness, tp.acidity, tp.body,
          JSON.stringify(tp.flavor_descriptors ?? []), tp.notes
        )
      })
    }
  })
  create()

  const tasting = db.prepare(`
    SELECT t.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression
    FROM tastings t
    LEFT JOIN batches b ON b.id = t.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    WHERE t.id = ?
  `).get(id)
  const tps = db.prepare('SELECT * FROM tasting_timepoints WHERE tasting_id = ?').all(id)
  res.status(201).json({ ...tasting, timepoints: tps })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tastings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
