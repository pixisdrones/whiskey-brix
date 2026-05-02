import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  const tests = db.prepare(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id,
           r.sku, r.expression, r.melt_min, r.melt_max,
           m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN molds m ON m.id = ft.mold_id
    ORDER BY ft.created_at DESC
  `).all()
  res.json(tests)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const {
    batch_id, mold_id, date, mold_type, volume_fl_oz,
    freezer_temp, freezer_out_temp, freezer_location,
    freezer_in_time, freezer_out_time,
    qty_cubes, hardness, notes
  } = req.body

  // freezer_temp is now "Freezer In Temp" — keep the column name for backwards compat
  // Auto-calculate freeze_time in minutes if both times provided
  let freeze_time = null
  if (freezer_in_time && freezer_out_time) {
    const inMs = new Date(freezer_in_time).getTime()
    const outMs = new Date(freezer_out_time).getTime()
    if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
      freeze_time = Math.round((outMs - inMs) / 60000)
    }
  }

  db.prepare(`
    INSERT INTO freeze_tests (id, batch_id, mold_id, date, mold_type, volume_fl_oz,
      freezer_temp, freezer_out_temp, freezer_location, freezer_in_time, freezer_out_time,
      freeze_time, qty_cubes, hardness, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, batch_id, mold_id ?? null, date, mold_type ?? null, volume_fl_oz ?? null,
    freezer_temp ?? null, freezer_out_temp ?? null, freezer_location,
    freezer_in_time ?? null, freezer_out_time ?? null,
    freeze_time, qty_cubes ?? null, hardness, notes, now)

  // If mold_id provided, create batch_cube records
  if (mold_id) {
    const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(mold_id)
    if (mold) {
      const existingCubes = db.prepare('SELECT id FROM batch_cubes WHERE mold_id=? AND freeze_test_id=?').all(mold_id, id)
      if (existingCubes.length === 0) {
        const sections = qty_cubes ?? mold.sections
        const insertCube = db.prepare(`
          INSERT INTO batch_cubes (id, mold_id, batch_id, freeze_test_id, section_number, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'frozen', ?)
        `)
        const fillMold = db.transaction(() => {
          for (let s = 1; s <= sections; s++) {
            insertCube.run(randomUUID(), mold_id, batch_id, id, s, now)
          }
        })
        fillMold()
      }
    }
  }

  const test = db.prepare(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression, r.melt_min, r.melt_max,
           m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN molds m ON m.id = ft.mold_id
    WHERE ft.id = ?
  `).get(id)
  res.status(201).json(test)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM freeze_tests WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.put('/:id', (req, res) => {
  const {
    batch_id, mold_id, date, mold_type, volume_fl_oz,
    freezer_temp, freezer_out_temp, freezer_location,
    freezer_in_time, freezer_out_time, qty_cubes, hardness, notes
  } = req.body

  let freeze_time = null
  if (freezer_in_time && freezer_out_time) {
    const inMs = new Date(freezer_in_time).getTime()
    const outMs = new Date(freezer_out_time).getTime()
    if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
      freeze_time = Math.round((outMs - inMs) / 60000)
    }
  }

  db.prepare(`
    UPDATE freeze_tests
    SET batch_id=?, mold_id=?, date=?, mold_type=?, volume_fl_oz=?,
        freezer_temp=?, freezer_out_temp=?, freezer_location=?,
        freezer_in_time=?, freezer_out_time=?, freeze_time=?,
        qty_cubes=?, hardness=?, notes=?
    WHERE id=?
  `).run(batch_id, mold_id ?? null, date, mold_type ?? null, volume_fl_oz ?? null,
    freezer_temp ?? null, freezer_out_temp ?? null, freezer_location ?? null,
    freezer_in_time ?? null, freezer_out_time ?? null, freeze_time,
    qty_cubes ?? null, hardness, notes ?? null, req.params.id)

  const test = db.prepare(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression, r.melt_min, r.melt_max,
           m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN molds m ON m.id = ft.mold_id
    WHERE ft.id = ?
  `).get(req.params.id)
  res.json(test)
})

export default router
