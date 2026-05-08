import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

const parseFlavors = (val) => { try { return JSON.parse(val) } catch { return val ?? [] } }

const fetchTasting = async (id) => {
  const result = await client.execute({
    sql: `SELECT t.*,
                 b.batch_id as batch_label, b.recipe_id,
                 r.sku, r.expression,
                 bc.mold_id, bc.section_number,
                 m.shape as mold_shape, m.volume_fl_oz as mold_volume
          FROM tastings t
          LEFT JOIN batches b ON b.id = t.batch_id
          LEFT JOIN recipes r ON r.id = b.recipe_id
          LEFT JOIN batch_cubes bc ON bc.id = t.cube_id
          LEFT JOIN molds m ON m.id = bc.mold_id
          WHERE t.id = ?`,
    args: [id]
  })
  const tasting = result.rows[0]
  const tps = await client.execute({ sql: 'SELECT * FROM tasting_timepoints WHERE tasting_id = ? ORDER BY phase', args: [id] })
  return {
    ...tasting,
    timepoints: tps.rows.map(tp => ({ ...tp, flavor_descriptors: parseFlavors(tp.flavor_descriptors) }))
  }
}

router.get('/', async (req, res) => {
  const result = await client.execute(`
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
  `)
  const tastings = await Promise.all(result.rows.map(async t => {
    const tps = await client.execute({ sql: 'SELECT * FROM tasting_timepoints WHERE tasting_id = ? ORDER BY phase', args: [t.id] })
    return { ...t, timepoints: tps.rows.map(tp => ({ ...tp, flavor_descriptors: parseFlavors(tp.flavor_descriptors) })) }
  }))
  res.json(tastings)
})

router.get('/next-label', async (req, res) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const countResult = await client.execute('SELECT COUNT(*) as c FROM tastings')
  const seq = String((Number(countResult.rows[0]?.c) ?? 0) + 1).padStart(3, '0')
  res.json({ tasting_label: `T-${dateStr}-${seq}` })
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const {
    batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
    spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
    recommended_revision, pour_time, timepoints
  } = req.body

  const dateStr = (date || now.slice(0, 10)).replace(/-/g, '')
  const countResult = await client.execute('SELECT COUNT(*) as c FROM tastings')
  const tasting_label = `T-${dateStr}-${String((Number(countResult.rows[0]?.c) ?? 0) + 1).padStart(3, '0')}`

  const stmts = [
    {
      sql: `INSERT INTO tastings (id, tasting_label, batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
              spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
              recommended_revision, pour_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, tasting_label, batch_id, freeze_test_id ?? null, cube_id ?? null, date, taster,
        spirit_type, spirit_brand, spirit_volume ?? null, spirit_integration, melt_timing,
        ritual_satisfaction, overall_score, recommended_revision, pour_time ?? null, now]
    }
  ]

  if (Array.isArray(timepoints)) {
    timepoints.forEach(tp => {
      stmts.push({
        sql: `INSERT INTO tasting_timepoints (id, tasting_id, phase, aroma_intensity, sweetness, acidity, body, flavor_descriptors, cube_melt_pct, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), id, tp.phase, tp.aroma_intensity, tp.sweetness, tp.acidity, tp.body,
          JSON.stringify(tp.flavor_descriptors ?? []), tp.cube_melt_pct ?? null, tp.notes ?? null]
      })
    })
  }

  if (cube_id) {
    stmts.push({ sql: `UPDATE batch_cubes SET status=?, tasting_id=? WHERE id=?`, args: ['tasted', id, cube_id] })
  }

  await client.batch(stmts, 'write')
  res.status(201).json(await fetchTasting(id))
})

router.put('/:id', async (req, res) => {
  const {
    batch_id, freeze_test_id, cube_id, date, taster, spirit_type, spirit_brand,
    spirit_volume, spirit_integration, melt_timing, ritual_satisfaction, overall_score,
    recommended_revision, pour_time, timepoints
  } = req.body

  const stmts = [
    {
      sql: `UPDATE tastings
            SET batch_id=?, freeze_test_id=?, cube_id=?, date=?, taster=?, spirit_type=?, spirit_brand=?,
                spirit_volume=?, spirit_integration=?, melt_timing=?, ritual_satisfaction=?, overall_score=?,
                recommended_revision=?, pour_time=?
            WHERE id=?`,
      args: [batch_id, freeze_test_id ?? null, cube_id ?? null, date, taster,
        spirit_type, spirit_brand, spirit_volume ?? null, spirit_integration, melt_timing,
        ritual_satisfaction, overall_score, recommended_revision, pour_time ?? null, req.params.id]
    }
  ]

  if (Array.isArray(timepoints)) {
    stmts.push({ sql: 'DELETE FROM tasting_timepoints WHERE tasting_id = ?', args: [req.params.id] })
    timepoints.forEach(tp => {
      stmts.push({
        sql: `INSERT INTO tasting_timepoints (id, tasting_id, phase, aroma_intensity, sweetness, acidity, body, flavor_descriptors, cube_melt_pct, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), req.params.id, tp.phase, tp.aroma_intensity, tp.sweetness, tp.acidity, tp.body,
          JSON.stringify(tp.flavor_descriptors ?? []), tp.cube_melt_pct ?? null, tp.notes ?? null]
      })
    })
  }

  await client.batch(stmts, 'write')
  res.json(await fetchTasting(req.params.id))
})

router.delete('/:id', async (req, res) => {
  const t = await client.execute({ sql: 'SELECT cube_id FROM tastings WHERE id = ?', args: [req.params.id] })
  const cube_id = t.rows[0]?.cube_id
  if (cube_id) {
    await client.execute({ sql: `UPDATE batch_cubes SET status=?, tasting_id=NULL WHERE id=?`, args: ['frozen', cube_id] })
  }
  await client.execute({ sql: 'DELETE FROM tastings WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
