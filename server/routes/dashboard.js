import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const totalRecipes = db.prepare('SELECT COUNT(*) as c FROM recipes').get().c
  const totalBatches = db.prepare('SELECT COUNT(*) as c FROM batches').get().c

  const brixMisses = db.prepare(`
    SELECT COUNT(*) as c FROM batches b
    JOIN recipes r ON r.id = b.recipe_id
    WHERE b.observed_brix IS NOT NULL
      AND (b.observed_brix < r.brix_min OR b.observed_brix > r.brix_max)
  `).get().c

  const totalFreezeTests = db.prepare('SELECT COUNT(*) as c FROM freeze_tests').get().c
  const avgScore = db.prepare('SELECT AVG(overall_score) as avg FROM tastings WHERE overall_score IS NOT NULL').get().avg

  const qaTargets = db.prepare(`
    SELECT r.id, r.sku, r.expression, r.status,
           r.brix_min, r.brix_max, r.ph_min, r.ph_max, r.melt_min, r.melt_max,
           COUNT(DISTINCT b.id) as batch_count
    FROM recipes r
    LEFT JOIN batches b ON b.recipe_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at
  `).all()

  // Recent batches with brix/pH status
  const recentBatches = db.prepare(`
    SELECT b.id, b.batch_id, b.date, b.batch_size, b.batch_unit,
           b.observed_brix, b.observed_ph, b.color,
           r.sku, r.expression, r.brix_min, r.brix_max, r.ph_min, r.ph_max
    FROM batches b
    LEFT JOIN recipes r ON r.id = b.recipe_id
    ORDER BY b.created_at DESC
    LIMIT 20
  `).all()

  // Batch brix distribution for charting
  const brixDist = db.prepare(`
    SELECT b.observed_brix, r.brix_min, r.brix_max, r.expression
    FROM batches b JOIN recipes r ON r.id = b.recipe_id
    WHERE b.observed_brix IS NOT NULL
    ORDER BY b.created_at DESC
    LIMIT 50
  `).all()

  res.json({
    totalRecipes,
    totalBatches,
    brixMisses,
    totalFreezeTests,
    avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
    qaTargets,
    recentBatches,
    brixDist
  })
})

export default router
