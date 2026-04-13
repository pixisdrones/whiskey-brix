import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'ccdb.sqlite'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Core tables ──────────────────────────────────────────────────────────────

db.exec(`
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
    parent_id TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    catalog_id TEXT,
    name TEXT,
    brand TEXT,
    amount REAL,
    unit TEXT,
    sort_order INTEGER
  );

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
  );

  CREATE TABLE IF NOT EXISTS freeze_tests (
    id TEXT PRIMARY KEY,
    batch_id TEXT REFERENCES batches(id),
    mold_id TEXT,
    date TEXT,
    mold_type TEXT,
    cube_size REAL,
    volume_fl_oz REAL,
    freezer_temp REAL,
    freezer_location TEXT,
    freezer_in_time TEXT,
    freezer_out_time TEXT,
    freeze_time REAL,
    hardness INTEGER,
    slush_start REAL,
    full_melt REAL,
    separation TEXT DEFAULT 'no',
    notes TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tastings (
    id TEXT PRIMARY KEY,
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
    created_at TEXT
  );

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
  );

  CREATE TABLE IF NOT EXISTS ingredients_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    cost_per_unit REAL,
    notes TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS molds (
    id TEXT PRIMARY KEY,
    shape TEXT NOT NULL,
    volume_fl_oz REAL NOT NULL,
    sections INTEGER NOT NULL,
    mold_number INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS batch_cubes (
    id TEXT PRIMARY KEY,
    mold_id TEXT REFERENCES molds(id),
    batch_id TEXT REFERENCES batches(id),
    freeze_test_id TEXT REFERENCES freeze_tests(id),
    section_number INTEGER NOT NULL,
    status TEXT DEFAULT 'frozen',
    tasting_id TEXT,
    created_at TEXT
  );
`)

// ── Safe migrations (add columns to existing tables) ─────────────────────────
function migrate(sql) {
  try { db.exec(sql) } catch (_) {}
}

migrate('ALTER TABLE ingredients ADD COLUMN catalog_id TEXT')
migrate('ALTER TABLE freeze_tests ADD COLUMN mold_id TEXT')
migrate('ALTER TABLE freeze_tests ADD COLUMN volume_fl_oz REAL')
migrate('ALTER TABLE freeze_tests ADD COLUMN freezer_in_time TEXT')
migrate('ALTER TABLE freeze_tests ADD COLUMN freezer_out_time TEXT')
migrate('ALTER TABLE tastings ADD COLUMN spirit_volume REAL')
migrate('ALTER TABLE tastings ADD COLUMN cube_id TEXT')
migrate('ALTER TABLE tasting_timepoints ADD COLUMN cube_melt_pct REAL')

// ── Mold ID generator ─────────────────────────────────────────────────────────
const SHAPE_CODES = {
  'Sphere': 'SP', 'Cube': 'CU', 'Collins Spear': 'CS',
  'Cylinder': 'CY', 'Other': 'OT'
}
export function generateMoldId(shape, volume_fl_oz, sections) {
  const code = SHAPE_CODES[shape] ?? 'OT'
  const vol  = String(Math.round(volume_fl_oz)).padStart(2, '0')
  const sec  = String(sections).padStart(2, '0')
  const existing = db.prepare(
    'SELECT COUNT(*) as c FROM molds WHERE shape=? AND volume_fl_oz=? AND sections=?'
  ).get(shape, volume_fl_oz, sections)
  const num = String((existing?.c ?? 0) + 1).padStart(2, '0')
  return `${code}${vol}${sec}${num}`
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const count = db.prepare('SELECT COUNT(*) as c FROM recipes').get()
if (count.c === 0) {
  const now = new Date().toISOString()
  const insertRecipe = db.prepare(`
    INSERT INTO recipes (id,sku,expression,version,status,spirit_pairing,brix_min,brix_max,ph_min,ph_max,melt_min,melt_max,notes,created_at)
    VALUES (@id,@sku,@expression,@version,@status,@spirit_pairing,@brix_min,@brix_max,@ph_min,@ph_max,@melt_min,@melt_max,@notes,@created_at)
  `)
  const insertIng = db.prepare(`
    INSERT INTO ingredients (id,recipe_id,name,amount,unit,sort_order)
    VALUES (@id,@recipe_id,@name,@amount,@unit,@sort_order)
  `)
  const seed = db.transaction(() => {
    const r1 = randomUUID()
    insertRecipe.run({ id: r1, sku: 'BLM-HL-001', expression: 'Honey Lemon', version: '1.0', status: 'active', spirit_pairing: 'Bourbon', brix_min: 20, brix_max: 22, ph_min: 2.4, ph_max: 3.0, melt_min: 8, melt_max: 12, notes: null, created_at: now })
    ;[
      { name: 'Fresh lemon juice', amount: 120, unit: 'ml', sort_order: 0 },
      { name: 'Raw honey',         amount: 80,  unit: 'ml', sort_order: 1 },
      { name: 'Simple syrup 2:1',  amount: 60,  unit: 'ml', sort_order: 2 },
      { name: 'Filtered water',    amount: 40,  unit: 'ml', sort_order: 3 },
    ].forEach(i => insertIng.run({ id: randomUUID(), recipe_id: r1, ...i }))

    const r2 = randomUUID()
    insertRecipe.run({ id: r2, sku: 'BLM-RLP-001', expression: 'Rosemary Lemon Peel', version: '1.0', status: 'active', spirit_pairing: 'Gin', brix_min: 12, brix_max: 15, ph_min: 2.8, ph_max: 3.2, melt_min: 8, melt_max: 12, notes: null, created_at: now })
    const r3 = randomUUID()
    insertRecipe.run({ id: r3, sku: 'BLM-LA-001', expression: 'Lime Agave', version: '1.0', status: 'active', spirit_pairing: 'Tequila', brix_min: 20, brix_max: 22, ph_min: 2.2, ph_max: 2.8, melt_min: 6, melt_max: 10, notes: null, created_at: now })
    const r4 = randomUUID()
    insertRecipe.run({ id: r4, sku: 'BLM-CH-001', expression: 'Cranberry Hibiscus', version: '1.0', status: 'active', spirit_pairing: 'Vodka', brix_min: 18, brix_max: 20, ph_min: 2.8, ph_max: 3.4, melt_min: 8, melt_max: 12, notes: null, created_at: now })
    const r5 = randomUUID()
    insertRecipe.run({ id: r5, sku: 'BLM-MJ-001', expression: 'Mint Julep', version: '1.0', status: 'experimental', spirit_pairing: 'Bourbon', brix_min: 18, brix_max: 21, ph_min: 2.8, ph_max: 3.2, melt_min: 5, melt_max: 8, notes: null, created_at: now })
  })
  seed()
  console.log('Database seeded with 5 recipes.')
}

export default db
