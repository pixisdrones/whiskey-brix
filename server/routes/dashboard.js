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
  const meltIssues = db.prepare(`
    SELECT COUNT(*) as c FROM freeze_tests ft
    JOIN batches b ON b.id = ft.batch_id
    JOIN recipes r ON r.id = b.recipe_id
    WHERE ft.full_melt IS NOT NULL
      AND (ft.full_melt < r.melt_min OR ft.full_melt > r.melt_max)
  `).get().c

  const avgScore = db.prepare('SELECT AVG(overall_score) as avg FROM tastings WHERE overall_score IS NOT NULL').get().avg

  const qaTargets = db.prepare(`
    SELECT r.id, r.sku, r.expression, r.status, r.spirit_pairing,
           r.brix_min, r.brix_max, r.ph_min, r.ph_max, r.melt_min, r.melt_max,
           COUNT(DISTINCT b.id) as batch_count
    FROM recipes r
    LEFT JOIN batches b ON b.recipe_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at
  `).all()

  res.json({
    totalRecipes,
    totalBatches,
    brixMisses,
    totalFreezeTests,
    meltIssues,
    avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
    qaTargets
  })
})

export default router
