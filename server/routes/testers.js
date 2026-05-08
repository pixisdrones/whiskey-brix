import { Router } from 'express'
import client from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  const result = await client.execute(`
    SELECT t.*,
      ROUND(AVG(ta.overall_score), 1) AS avg_score,
      COUNT(ta.id)                    AS tasting_count
    FROM testers t
    LEFT JOIN tastings ta ON ta.taster = (t.first_name || ' ' || t.last_name)
    GROUP BY t.id
    ORDER BY t.last_name, t.first_name
  `)
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const { first_name, last_name, gender, dob, email, zip_code, alcohol_freq } = req.body
  await client.execute({
    sql: `INSERT INTO testers (id, first_name, last_name, gender, dob, email, zip_code, alcohol_freq, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, first_name, last_name, gender ?? null, dob ?? null, email ?? null, zip_code ?? null, alcohol_freq ?? null, now]
  })
  const tester = await client.execute({ sql: 'SELECT * FROM testers WHERE id = ?', args: [id] })
  res.status(201).json(tester.rows[0])
})

router.put('/:id', async (req, res) => {
  const { first_name, last_name, gender, dob, email, zip_code, alcohol_freq } = req.body
  await client.execute({
    sql: `UPDATE testers SET first_name=?, last_name=?, gender=?, dob=?, email=?, zip_code=?, alcohol_freq=? WHERE id=?`,
    args: [first_name, last_name, gender ?? null, dob ?? null, email ?? null, zip_code ?? null, alcohol_freq ?? null, req.params.id]
  })
  const result = await client.execute({
    sql: `SELECT t.*, ROUND(AVG(ta.overall_score), 1) AS avg_score, COUNT(ta.id) AS tasting_count
          FROM testers t
          LEFT JOIN tastings ta ON ta.taster = (t.first_name || ' ' || t.last_name)
          WHERE t.id = ?
          GROUP BY t.id`,
    args: [req.params.id]
  })
  res.json(result.rows[0])
})

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM testers WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
