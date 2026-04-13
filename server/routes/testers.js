import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

// List all testers with avg_score and tasting_count joined from tastings
router.get('/', (req, res) => {
  const testers = db.prepare(`
    SELECT t.*,
      ROUND(AVG(ta.overall_score), 1) AS avg_score,
      COUNT(ta.id)                    AS tasting_count
    FROM testers t
    LEFT JOIN tastings ta ON ta.taster = (t.first_name || ' ' || t.last_name)
    GROUP BY t.id
    ORDER BY t.last_name, t.first_name
  `).all()
  res.json(testers)
})

router.post('/', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { first_name, last_name, gender, dob, email, zip_code, alcohol_freq } = req.body
  db.prepare(`
    INSERT INTO testers (id, first_name, last_name, gender, dob, email, zip_code, alcohol_freq, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, first_name, last_name, gender ?? null, dob ?? null, email ?? null, zip_code ?? null, alcohol_freq ?? null, now)
  res.status(201).json(db.prepare('SELECT * FROM testers WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const { first_name, last_name, gender, dob, email, zip_code, alcohol_freq } = req.body
  db.prepare(`
    UPDATE testers
    SET first_name=?, last_name=?, gender=?, dob=?, email=?, zip_code=?, alcohol_freq=?
    WHERE id=?
  `).run(first_name, last_name, gender ?? null, dob ?? null, email ?? null, zip_code ?? null, alcohol_freq ?? null, req.params.id)
  res.json(db.prepare(`
    SELECT t.*, ROUND(AVG(ta.overall_score), 1) AS avg_score, COUNT(ta.id) AS tasting_count
    FROM testers t
    LEFT JOIN tastings ta ON ta.taster = (t.first_name || ' ' || t.last_name)
    WHERE t.id = ?
    GROUP BY t.id
  `).get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM testers WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
