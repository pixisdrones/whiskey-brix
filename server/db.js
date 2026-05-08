import { createClient } from '@libsql/client'
import { randomUUID } from 'crypto'
import 'dotenv/config'

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await client.execute(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    expression TEXT,
    version TEXT,
    status TEXT DEFAULT 'active',
    spirit_pairing TEXT,
    brix_min REAL, brix_max REAL,
    ph_min REAL, ph_max REAL,
    melt_min INTEGER, melt_max INTEGER,
    mold_type TEXT,
    notes TEXT,
    recipe_body TEXT,
    parent_id TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    catalog_id TEXT,
    name TEXT,
    brand TEXT,
    amount REAL,
    unit TEXT,
    sort_order INTEGER
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    recipe_id TEXT REFERENCES recipes(id),
    batch_id TEXT,
    date TEXT,
    batch_size REAL,
    batch_unit TEXT,
    start_time TEXT,
    end_time TEXT,
    observed_brix REAL,
    observed_ph REAL,
    color TEXT,
    notes TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS freeze_tests (
    id TEXT PRIMARY KEY,
    batch_id TEXT REFERENCES batches(id),
    mold_id TEXT,
    date TEXT,
    mold_type TEXT,
    cube_size REAL,
    volume_fl_oz REAL,
    freezer_temp REAL,
    freezer_out_temp REAL,
    freezer_location TEXT,
    freezer_in_time TEXT,
    freezer_out_time TEXT,
    freeze_time REAL,
    qty_cubes INTEGER,
    hardness INTEGER,
    slush_start REAL,
    full_melt REAL,
    separation TEXT DEFAULT 'no',
    notes TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS tastings (
    id TEXT PRIMARY KEY,
    tasting_label TEXT,
    batch_id TEXT REFERENCES batches(id),
    freeze_test_id TEXT REFERENCES freeze_tests(id),
    cube_id TEXT,
    date TEXT,
    taster TEXT,
    spirit_type TEXT,
    spirit_brand TEXT,
    spirit_volume REAL,
    spirit_integration INTEGER,
    melt_timing TEXT,
    ritual_satisfaction INTEGER,
    overall_score INTEGER,
    recommended_revision TEXT,
    pour_time TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS tasting_timepoints (
    id TEXT PRIMARY KEY,
    tasting_id TEXT REFERENCES tastings(id) ON DELETE CASCADE,
    phase TEXT,
    aroma_intensity INTEGER,
    sweetness INTEGER,
    acidity INTEGER,
    body INTEGER,
    flavor_descriptors TEXT,
    cube_melt_pct REAL,
    notes TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS ingredients_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    brand TEXT,
    vendor TEXT,
    qty_purchased REAL,
    purchase_price REAL,
    cost_per_unit REAL,
    notes TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS molds (
    id TEXT PRIMARY KEY,
    shape TEXT NOT NULL,
    volume_fl_oz REAL NOT NULL,
    sections INTEGER NOT NULL,
    mold_number INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS batch_cubes (
    id TEXT PRIMARY KEY,
    mold_id TEXT REFERENCES molds(id),
    batch_id TEXT REFERENCES batches(id),
    freeze_test_id TEXT REFERENCES freeze_tests(id),
    section_number INTEGER NOT NULL,
    status TEXT DEFAULT 'frozen',
    tasting_id TEXT,
    created_at TEXT
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS testers (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT,
    dob TEXT,
    email TEXT,
    zip_code TEXT,
    alcohol_freq TEXT,
    created_at TEXT
  )
`)

// Seed data if empty
const countResult = await client.execute('SELECT COUNT(*) as c FROM recipes')
if (Number(countResult.rows[0].c) === 0) {
  const now = new Date().toISOString()
  const r1 = randomUUID(), r2 = randomUUID(), r3 = randomUUID(), r4 = randomUUID(), r5 = randomUUID()
  await client.batch([
    { sql: `INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [r1,'BLM-HL-001','Honey Lemon','1.0','active','Bourbon',20,22,2.4,3.0,8,12,null,now] },
    { sql: `INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [r2,'BLM-RLP-001','Rosemary Lemon Peel','1.0','active','Gin',12,15,2.8,3.2,8,12,null,now] },
    { sql: `INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [r3,'BLM-LA-001','Lime Agave','1.0','active','Tequila',20,22,2.2,2.8,6,10,null,now] },
    { sql: `INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [r4,'BLM-CH-001','Cranberry Hibiscus','1.0','active','Vodka',18,20,2.8,3.4,8,12,null,now] },
    { sql: `INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [r5,'BLM-MJ-001','Mint Julep','1.0','experimental','Bourbon',18,21,2.8,3.2,5,8,null,now] },
    { sql: `INSERT INTO ingredients (id,recipe_id,name,amount,unit,sort_order) VALUES (?,?,?,?,?,?)`, args: [randomUUID(),r1,'Fresh lemon juice',120,'ml',0] },
    { sql: `INSERT INTO ingredients (id,recipe_id,name,amount,unit,sort_order) VALUES (?,?,?,?,?,?)`, args: [randomUUID(),r1,'Raw honey',80,'ml',1] },
    { sql: `INSERT INTO ingredients (id,recipe_id,name,amount,unit,sort_order) VALUES (?,?,?,?,?,?)`, args: [randomUUID(),r1,'Simple syrup 2:1',60,'ml',2] },
    { sql: `INSERT INTO ingredients (id,recipe_id,name,amount,unit,sort_order) VALUES (?,?,?,?,?,?)`, args: [randomUUID(),r1,'Filtered water',40,'ml',3] },
  ], 'write')
  console.log('Database seeded with 5 recipes.')
}

const SHAPE_CODES = {
  'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS',
  'Cylinder': 'CY', 'Other': 'OT'
}

export async function generateMoldId(shape, volume_fl_oz, sections) {
  const code = SHAPE_CODES[shape] ?? 'OT'
  const vol = String(Math.round(volume_fl_oz)).padStart(2, '0')
  const sec = String(sections).padStart(2, '0')
  const result = await client.execute({
    sql: 'SELECT COUNT(*) as c FROM molds WHERE shape=? AND volume_fl_oz=? AND sections=?',
    args: [shape, volume_fl_oz, sections]
  })
  const num = String((Number(result.rows[0]?.c) ?? 0) + 1).padStart(2, '0')
  return `${code}${vol}${sec}${num}`
}

export default client
