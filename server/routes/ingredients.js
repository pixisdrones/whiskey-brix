import { Router } from 'express'
import client from '../db.js'

const router = Router()

router.delete('/:id', async (req, res) => {
  await client.execute({ sql: 'DELETE FROM ingredients WHERE id = ?', args: [req.params.id] })
  res.json({ ok: true })
})

export default router
