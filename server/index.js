import express from 'express'
import cors from 'cors'
import recipesRouter from './routes/recipes.js'
import ingredientsRouter from './routes/ingredients.js'
import batchesRouter from './routes/batches.js'
import freezeTestsRouter from './routes/freeze-tests.js'
import tastingsRouter from './routes/tastings.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/recipes', recipesRouter)
app.use('/api/ingredients', ingredientsRouter)
app.use('/api/batches', batchesRouter)
app.use('/api/freeze-tests', freezeTestsRouter)
app.use('/api/tastings', tastingsRouter)
app.use('/api/dashboard', dashboardRouter)

app.listen(PORT, () => {
  console.log(`Whiskey Brix API running on http://localhost:${PORT}`)
})
