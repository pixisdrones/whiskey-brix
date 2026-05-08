import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute(`
    SELECT ft.*, b.batch_id as batch_label, b.recipe_id,
           r.sku, r.expression, r.melt_min, r.melt_max,
           m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
    FROM freeze_tests ft
    LEFT JOIN batches b ON b.id = ft.batch_id
    LEFT JOIN recipes r ON r.id = b.recipe_id
    LEFT JOIN molds m ON m.id = ft.mold_id
    ORDER BY ft.created_at DESC
  `)
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const {
    batch_id, mold_id, date, mold_type, volume_fl_oz,
    freezer_temp, freezer_out_temp, freezer_location,
    freezer_in_time, freezer_out_time,
    qty_cubes, hardness, notes
  } = req.body

  let freeze_time = null
  if (freezer_in_time && freezer_out_time) {
    const inMs = new Date(freezer_in_time).getTime()
    const outMs = new Date(freezer_out_time).getTime()
    if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
      freeze_time = Math.round((outMs - inMs) / 60000)
    }
  }

  await client.execute({
    sql: `INSERT INTO freeze_tests (id, batch_id, mold_id, date, mold_type, volume_fl_oz,
            freezer_temp, freezer_out_temp, freezer_location, freezer_in_time, freezer_out_time,
            freeze_time, qty_cubes, hardness, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, batch_id, mold_id ?? null, date, mold_type ?? null, volume_fl_oz ?? null,
      freezer_temp ?? null, freezer_out_temp ?? null, freezer_location,
      freezer_in_time ?? null, freezer_out_time ?? null,
      freeze_time, qty_cubes ?? null, hardness, notes, now]
  })

  if (mold_id) {
    const moldResult = await client.execute({ sql: 'SELECT * FROM molds WHERE id = ?', args: [mold_id] })
    const mold = moldResult.rows[0]
    if (mold) {
      const existingResult = await client.execute({ sql: 'SELECT id FROM batch_cubes WHERE mold_id=? AND freeze_test_id=?', args: [mold_id, id] })
      if (existingResult.rows.length === 0) {
        const sections = qty_cubes ?? Number(mold.sections)
        const cubeStmts = []
        for (let s = 1; s <= sections; s++) {
          cubeStmts.push({
            sql: `INSERT INTO batch_cubes (id, mold_id, batch_id, freeze_test_id, section_number, status, created_at) VALUES (?, ?, ?, ?, ?, 'frozen', ?)`,
            args: [randomUUID(), mold_id, batch_id, id, s, now]
          })
        }
        await client.batch(cubeStmts, 'write')
      }
    }
  }

  const test = await client.execute({
    sql: `SELECT ft.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression, r.melt_min, r.melt_max,
                 m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
          FROM freeze_tests ft
          LEFT JOIN batches b ON b.id = ft.batch_id
          LEFT JOIN recipes r ON r.id = b.recipe_id
          LEFT JOIN molds m ON m.id = ft.mold_id
          WHERE ft.id = ?`,
    args: [id]
  })
  res.status(201).json(test.rows[0])
})

router.put('/:id', async (req, res) => {
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

  await client.execute({
    sql: `UPDATE freeze_tests
          SET batch_id=?, mold_id=?, date=?, mold_type=?, volume_fl_oz=?,
              freezer_temp=?, freezer_out_temp=?, freezer_location=?,
              freezer_in_time=?, freezer_out_time=?, freeze_time=?,
              qty_cubes=?, hardness=?, notes=?
          WHERE id=?`,
    args: [batch_id, mold_id ?? null, date, mold_type ?? null, volume_fl_oz ?? null,
      freezer_temp ?? null, freezer_out_temp ?? null, freezer_location ?? null,
      freezer_in_time ?? null, freezer_out_time ?? null, freeze_time,
      qty_cubes ?? null, hardness, notes ?? null, req.params.id]
  })

  const test = await client.execute({
    sql: `SELECT ft.*, b.batch_id as batch_label, b.recipe_id, r.sku, r.expression, r.melt_min, r.melt_max,
                 m.shape as mold_shape, m.volume_fl_oz as mold_volume, m.sections as mold_sections
          FROM freeze_tests ft
          LEFT JOIN batches b ON b.id = ft.batch_id
          LEFT JOIN recipes r ON r.id = b.recipe_id
          LEFT JOIN molds m ON m.id = ft.mold_id
          WHERE ft.id = ?`,
    args: [req.params.id]
  })
  res.json(test.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM freeze_tests WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
