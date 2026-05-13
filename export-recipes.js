import { createClient } from '@libsql/client'
import { writeFileSync } from 'fs'
const client = createClient({
  url: 'libsql://whiskey-brix-pvomps.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzgyMTAzNjEsImlkIjoiMDE5ZTA1OTgtNDgwMS03OGJhLWFmYTMtYjJmM2FmOTg4ZjZmIiwicmlkIjoiODE4MzVkNDAtNWNmZS00NTg0LWJmOTEtOGE4NDZkZjU5NzA1In0.aMm_3jyn0O8xwb3qwhd8kz93weOffOZhf0NJVHH1fwqQFAHDDnTYUqtWoSOoBMvsU674D6AD3uIyGNULq3XxBQ',
})

const recipes = await client.execute('SELECT * FROM recipes ORDER BY created_at')
const ingredients = await client.execute('SELECT * FROM ingredients ORDER BY recipe_id, sort_order')

const data = recipes.rows.map(r => ({
  ...r,
  ingredients: ingredients.rows.filter(i => i.recipe_id === r.id)
}))

writeFileSync('recipes-export.json', JSON.stringify(data, null, 2))
console.log(`Exported ${data.length} recipes to recipes-export.json`)
client.close()
