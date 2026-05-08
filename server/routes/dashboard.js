import { Router } from 'express'
import client from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  const [
    recipesResult, batchesResult, brixMissesResult,
    freezeResult, avgScoreResult, qaResult, recentResult, brixDistResult
  ] = await Promise.all([
    client.execute('SELECT COUNT(*) as c FROM recipes'),
    client.execute('SELECT COUNT(*) as c FROM batches'),
    client.execute(`
      SELECT COUNT(*) as c FROM batches b
      JOIN recipes r ON r.id = b.recipe_id
      WHERE b.observed_brix IS NOT NULL
        AND (b.observed_brix < r.brix_min OR b.observed_brix > r.brix_max)
    `),
    client.execute('SELECT COUNT(*) as c FROM freeze_tests'),
    client.execute('SELECT AVG(overall_score) as avg FROM tastings WHERE overall_score IS NOT NULL'),
    client.execute(`
      SELECT r.id, r.sku, r.expression, r.status,
             r.brix_min, r.brix_max, r.ph_min, r.ph_max, r.melt_min, r.melt_max,
             COUNT(DISTINCT b.id) as batch_count
      FROM recipes r
      LEFT JOIN batches b ON b.recipe_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at
    `),
    client.execute(`
      SELECT b.id, b.batch_id, b.date, b.batch_size, b.batch_unit,
             b.observed_brix, b.observed_ph, b.color,
             r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
      FROM batches b
      LEFT JOIN recipes r ON r.id = b.recipe_id
      ORDER BY b.created_at DESC
      LIMIT 20
    `),
    client.execute(`
      SELECT b.observed_brix, r.brix_min, r.brix_max, r.expression
      FROM batches b JOIN recipes r ON r.id = b.recipe_id
      WHERE b.observed_brix IS NOT NULL
      ORDER BY b.created_at DESC
      LIMIT 50
    `)
  ])

  const avgScore = avgScoreResult.rows[0]?.avg
  res.json({
    totalRecipes:    Number(recipesResult.rows[0].c),
    totalBatches:    Number(batchesResult.rows[0].c),
    brixMisses:      Number(brixMissesResult.rows[0].c),
    totalFreezeTests: Number(freezeResult.rows[0].c),
    avgScore:        avgScore ? Math.round(Number(avgScore) * 10) / 10 : null,
    qaTargets:       qaResult.rows,
    recentBatches:   recentResult.rows,
    brixDist:        brixDistResult.rows,
  })
})

export default router
