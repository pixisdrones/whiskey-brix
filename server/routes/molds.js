import { Router } from 'express'
import client, { generateMoldId } from '../db.js'
import { randomUUID as uuid } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute('SELECT * FROM molds ORDER BY created_at DESC')
  res.json(result.rows)
})

router.get('/:id/cubes', async (req, res) => {
  const result = await client.execute({
    sql: `SELECT bc.*,
                 b.batch_id as batch_label, b.date as batch_date,
                 r.sku, r.expression,
                 ft.date as freeze_date,
                 t.date as tasting_date, t.taster
          FROM batch_cubes bc
          LEFT JOIN batches b ON b.id = bc.batch_id
          LEFT JOIN recipes r ON r.id = b.recipe_id
          LEFT JOIN freeze_tests ft ON ft.id = bc.freeze_test_id
          LEFT JOIN tastings t ON t.id = bc.tasting_id
          WHERE bc.mold_id = ?
          ORDER BY bc.section_number`,
    args: [req.params.id]
  })
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const id = uuid()
  const now = new Date().toISOString()
  const { shape, volume_fl_oz, sections, notes } = req.body
  const countResult = await client.execute({
    sql: 'SELECT COUNT(*) as c FROM molds WHERE shape=? AND volume_fl_oz=? AND sections=?',
    args: [shape, volume_fl_oz, sections]
  })
  const mold_number = (Number(countResult.rows[0]?.c) ?? 0) + 1
  const mold_id_str = await generateMoldId(shape, volume_fl_oz, sections)

  await client.execute({
    sql: `INSERT INTO molds (id, shape, volume_fl_oz, sections, mold_number, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, shape, volume_fl_oz, sections, mold_number, notes ?? null, now]
  })

  const mold = await client.execute({ sql: 'SELECT * FROM molds WHERE id = ?', args: [id] })
  res.status(201).json({ ...mold.rows[0], mold_id_str })
})

router.post('/:id/fill', async (req, res) => {
  const { batch_id, freeze_test_id } = req.body
  const moldResult = await client.execute({ sql: 'SELECT * FROM molds WHERE id = ?', args: [req.params.id] })
  const mold = moldResult.rows[0]
  if (!mold) return res.status(404).json({ error: 'Mold not found' })

  const now = new Date().toISOString()
  const stmts = [
    { sql: `DELETE FROM batch_cubes WHERE mold_id=? AND batch_id=? AND status=?`, args: [req.params.id, batch_id, 'frozen'] }
  ]
  for (let s = 1; s <= Number(mold.sections); s++) {
    stmts.push({
      sql: `INSERT INTO batch_cubes (id, mold_id, batch_id, freeze_test_id, section_number, status, created_at) VALUES (?, ?, ?, ?, ?, 'frozen', ?)`,
      args: [uuid(), req.params.id, batch_id, freeze_test_id ?? null, s, now]
    })
  }
  await client.batch(stmts, 'write')

  const cubes = await client.execute({
    sql: 'SELECT * FROM batch_cubes WHERE mold_id=? AND batch_id=? ORDER BY section_number',
    args: [req.params.id, batch_id]
  })
  res.status(201).json(cubes.rows)
})

router.patch('/cubes/:cube_id', async (req, res) => {
  const { status, tasting_id } = req.body
  await client.execute({ sql: 'UPDATE batch_cubes SET status=?, tasting_id=? WHERE id=?', args: [status, tasting_id ?? null, req.params.cube_id] })
  const cube = await client.execute({ sql: 'SELECT * FROM batch_cubes WHERE id = ?', args: [req.params.cube_id] })
  res.json(cube.rows[0])
})

router.put('/:id', async (req, res) => {
  const { shape, volume_fl_oz, sections, notes } = req.body
  await client.execute({
    sql: 'UPDATE molds SET shape=?, volume_fl_oz=?, sections=?, notes=? WHERE id=?',
    args: [shape, Number(volume_fl_oz), Number(sections), notes ?? null, req.params.id]
  })
  const mold = await client.execute({ sql: 'SELECT * FROM molds WHERE id = ?', args: [req.params.id] })
  res.json(mold.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM molds WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
