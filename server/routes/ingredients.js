import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ingredients WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
