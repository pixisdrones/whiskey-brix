import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const tastings = db.prepare(`
    SELECT t.*,
           b.batch_id as batch_label, b.recipe_id,
           r.sku, r.expression,
           bc.mold_id, bc.section_number,
           m.shape as mold_shape, m.volume_fl_oz as mold_volume
    FROM tastings t
    LEFT JOIN batches b ON b.id = t.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN batch_cubes bc ON bc.id = t.cube_id
    LEFT JOIN molds m ON m.id = bc.mold_id
    ORDER BY t.created_at DESC
  `).all()

  const result = tastings.map(tasting => {
    const timepoints = db.prepare('SELECT * FROM tasting_timepoints WHERE tasting_id = ? ORDER BY phase').all(tasting.id)
    return {
      ...tasting,
      timepoints: timepoints.map(tp => ({
        ...tp,
        flavor_descriptors: (() => { try { return JSON.parse(tp.flavor_descriptors) } catch { return tp.flavor_descriptors ?? [] } })()
      }))
    }
  })
  res.json(result)
})

// GET next tasting label preview
router.get('/next-label', (req, res) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = db.prepare('SELECT COUNT(*) as c FROM tastings').get()?.c ?? 0
  const seq = String(count + 1).padStart(3, '0')
  res.json({ tasting_label: `T-${dateStr}-${seq}` })
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const {
    batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
    spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
    recommended_revision, timepoints
  } = req.body

  // Auto-generate tasting_label
  const dateStr = (date || now.slice(0, 10)).replace(/-/g, '')
  const count = db.prepare('SELECT COUNT(*) as c FROM tastings').get()?.c ?? 0
  const tasting_label = `T-${dateStr}-${String(count + 1).padStart(3, '0')}`

  const insertTasting = db.prepare(`
    INSERT INTO tastings (id, tasting_label, batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
      spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
      recommended_revision, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTimepoint = db.prepare(`
    INSERT INTO tasting_timepoints (id, tasting_id, phase, aroma_intensity, sweetness, acidity, body,
      flavor_descriptors, cube_melt_pct, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const create = db.transaction(() => {
    insertTasting.run(id, tasting_label, batch_id, freeze_test_id ?? null, cube_id ?? null, date, taster,
      spirit_type, spirit_brand, spirit_volume ?? null, spirit_integration, melt_timing,
      ritual_satisfaction, overall_score, recommended_revision, now)

    if (Array.isArray(timepoints)) {
      timepoints.forEach(tp => {
        insertTimepoint.run(
          randomUUID(), id, tp.phase,
          tp.aroma_intensity, tp.sweetness, tp.acidity, tp.body,
          JSON.stringify(tp.flavor_descriptors ?? []),
          tp.cube_melt_pct ?? null,
          tp.notes ?? null
        )
      })
    }

    // Mark cube as tasted if cube_id provided
    if (cube_id) {
      db.prepare('UPDATE batch_cubes SET status=?, tasting_id=? WHERE id=?').run('tasted', id, cube_id)
    }
  })
  create()

  const tasting = db.prepare(`
    SELECT t.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression,
           bc.mold_id, bc.section_number, m.shape as mold_shape, m.volume_fl_oz as mold_volume
    FROM tastings t
    LEFT JOIN batches b ON b.id = t.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN batch_cubes bc ON bc.id = t.cube_id
    LEFT JOIN molds m ON m.id = bc.mold_id
    WHERE t.id = ?
  `).get(id)
  const tps = db.prepare('SELECT * FROM tasting_timepoints WHERE tasting_id = ?').all(id)
  res.status(201).json({
    ...tasting,
    timepoints: tps.map(tp => ({
      ...tp,
      flavor_descriptors: (() => { try { return JSON.parse(tp.flavor_descriptors) } catch { return tp.flavor_descriptors ?? [] } })()
    }))
  })
})

router.put('/:id', (req, res) => {
  const {
    batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
    spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
    recommended_revision, timepoints
  } = req.body

  const updateTimepoint = db.prepare(`
    INSERT INTO tasting_timepoints (id, tasting_id, phase, aroma_intensity, sweetness, acidity, body,
      flavor_descriptors, cube_melt_pct, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE tastings
      SET batch_id=?, freeze_test_id=?, cube_id=?, date=?, taster=?, spirit_type=?, spirit_brand=?,
          spirit_volume=?, spirit_integration=?, melt_timing=?, ritual_satisfaction=?, overall_score=?,
          recommended_revision=?
      WHERE id=?
    `).run(batch_id, freeze_test_id ?? null, cube_id ?? null, date, taster,
      spirit_type, spirit_brand, spirit_volume ?? null, spirit_integration, melt_timing,
      ritual_satisfaction, overall_score, recommended_revision, req.params.id)

    if (Array.isArray(timepoints)) {
      db.prepare('DELETE FROM tasting_timepoints WHERE tasting_id = ?').run(req.params.id)
      timepoints.forEach(tp => {
        updateTimepoint.run(
          randomUUID(), req.params.id, tp.phase,
          tp.aroma_intensity, tp.sweetness, tp.acidity, tp.body,
          JSON.stringify(tp.flavor_descriptors ?? []),
          tp.cube_melt_pct ?? null,
          tp.notes ?? null
        )
      })
    }
  })
  update()

  const tasting = db.prepare(`
    SELECT t.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression,
           bc.mold_id, bc.section_number, m.shape as mold_shape, m.volume_fl_oz as mold_volume
    FROM tastings t
    LEFT JOIN batches b ON b.id = t.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN batch_cubes bc ON bc.id = t.cube_id
    LEFT JOIN molds m ON m.id = bc.mold_id
    WHERE t.id = ?
  `).get(req.params.id)
  const tps = db.prepare('SELECT * FROM tasting_timepoints WHERE tasting_id = ?').all(req.params.id)
  res.json({
    ...tasting,
    timepoints: tps.map(tp => ({
      ...tp,
      flavor_descriptors: (() => { try { return JSON.parse(tp.flavor_descriptors) } catch { return tp.flavor_descriptors ?? [] } })()
    }))
  })
})

router.delete('/:id', (req, res) => {
  const t = db.prepare('SELECT cube_id FROM tastings WHERE id = ?').get(req.params.id)
  if (t?.cube_id) {
    db.prepare('UPDATE batch_cubes SET status=?, tasting_id=NULL WHERE id=?').run('frozen', t.cube_id)
  }
  db.prepare('DELETE FROM tastings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
