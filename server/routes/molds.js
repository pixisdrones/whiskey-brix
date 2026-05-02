import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'
import { generateMoldId } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const molds = db.prepare('SELECT * FROM molds ORDER BY created_at DESC').all()
  res.json(molds)
})

// GET /api/molds/:id/cubes — list cubes for a mold with status
router.get('/:id/cubes', (req, res) => {
  const cubes = db.prepare(`
    SELECT bc.*,
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
    ORDER BY bc.section_number
  `).all(req.params.id)
  res.json(cubes)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { shape, volume_fl_oz, sections, notes } = req.body
  const mold_number_row = db.prepare(
    'SELECT COUNT(*) as c FROM molds WHERE shape=? AND volume_fl_oz=? AND sections=?'
  ).get(shape, volume_fl_oz, sections)
  const mold_number = (mold_number_row?.c ?? 0) + 1
  const mold_id_str = generateMoldId(shape, volume_fl_oz, sections)

  db.prepare(`
    INSERT INTO molds (id, shape, volume_fl_oz, sections, mold_number, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shape, volume_fl_oz, sections, mold_number, notes ?? null, now)

  res.status(201).json({ ...db.prepare('SELECT * FROM molds WHERE id = ?').get(id), mold_id_str })
})

// POST /api/molds/:id/fill — link a mold to a batch/freeze_test, creating batch_cube records
router.post('/:id/fill', (req, res) => {
  const { batch_id, freeze_test_id } = req.body
  const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(req.params.id)
  if (!mold) return res.status(404).json({ error: 'Mold not found' })

  const now = new Date().toISOString()
  const createCubes = db.transaction(() => {
    // Remove any unfilled existing cubes for this mold+batch combo
    db.prepare('DELETE FROM batch_cubes WHERE mold_id=? AND batch_id=? AND status=?').run(req.params.id, batch_id, 'frozen')
    for (let s = 1; s <= mold.sections; s++) {
      db.prepare(`
        INSERT INTO batch_cubes (id, mold_id, batch_id, freeze_test_id, section_number, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'frozen', ?)
      `).run(randomUUID(), req.params.id, batch_id, freeze_test_id ?? null, s, now)
    }
  })
  createCubes()

  const cubes = db.prepare('SELECT * FROM batch_cubes WHERE mold_id=? AND batch_id=? ORDER BY section_number').all(req.params.id, batch_id)
  res.status(201).json(cubes)
})

// PATCH /api/molds/cubes/:cube_id — update cube status (mark as used in tasting)
router.patch('/cubes/:cube_id', (req, res) => {
  const { status, tasting_id } = req.body
  db.prepare('UPDATE batch_cubes SET status=?, tasting_id=? WHERE id=?').run(status, tasting_id ?? null, req.params.cube_id)
  res.json(db.prepare('SELECT * FROM batch_cubes WHERE id = ?').get(req.params.cube_id))
})

router.put('/:id', (req, res) => {
  const { shape, volume_fl_oz, sections, notes } = req.body
  db.prepare('UPDATE molds SET shape=?, volume_fl_oz=?, sections=?, notes=? WHERE id=?')
    .run(shape, Number(volume_fl_oz), Number(sections), notes ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM molds WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM molds WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
