import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Stat from './shared/Stat.jsx'
import Badge from './shared/Badge.jsx'
import SectionHeader from './shared/SectionHeader.jsx'

function BrixBar({ batch }) {
  const { observed_brix, brix_min, brix_max, observed_ph, ph_min, ph_max } = batch
  const brixOk = observed_brix != null && brix_min != null && observed_brix >= brix_min && observed_brix <= brix_max
  const brixLow = observed_brix != null && brix_min != null && observed_brix < brix_min
  const brixHigh = observed_brix != null && brix_min != null && observed_brix > brix_max
  const phOk = observed_ph != null && ph_min != null && observed_ph >= ph_min && observed_ph <= ph_max
  const phBad = observed_ph != null && ph_min != null && (observed_ph < ph_min || observed_ph > ph_max)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      {observed_brix != null && (
        <span style={{
          padding: '2px 7px', borderRadius: 100, fontWeight: 600,
          background: brixOk ? 'var(--green-light)' : brixLow ? 'var(--blue-light)' : 'var(--amber-light)',
          color: brixOk ? 'var(--green)' : brixLow ? 'var(--blue)' : 'var(--amber)'
        }}>
          {brixLow ? '↓' : brixHigh ? '↑' : '✓'} {observed_brix} °Bx
        </span>
      )}
      {observed_ph != null && (
        <span style={{
          padding: '2px 7px', borderRadius: 100, fontWeight: 600,
          background: phOk ? 'var(--green-light)' : 'var(--red-light)',
          color: phOk ? 'var(--green)' : 'var(--red)'
        }}>
          pH {observed_ph}
        </span>
      )}
    </div>
  )
}

function BrixChart({ data }) {
  if (!data || data.length === 0) return null
  const grouped = {}
  data.forEach(d => {
    if (!grouped[d.expression]) grouped[d.expression] = []
    grouped[d.expression].push(d)
  })

  return (
    <div>
      {Object.entries(grouped).map(([expr, items]) => {
        const inRange = items.filter(d => d.observed_brix >= d.brix_min && d.observed_brix <= d.brix_max).length
        const pct = Math.round((inRange / items.length) * 100)
        return (
          <div key={expr} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{expr}</span>
              <span className="text-muted">{inRange}/{items.length} on target</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg)', border: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: pct === 100 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)',
                borderRadius: 4, transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const QA_COLS = [
  { label: 'SKU',             key: 'sku' },
  { label: 'Name',            key: 'expression' },
  { label: 'Status',          key: 'status' },
  { label: 'Last Created',    key: 'last_batch_date' },
  { label: 'Target Brix',     key: 'brix_min' },
  { label: 'Target pH',       key: 'ph_min' },
  { label: 'Melt Window',     key: 'melt_min' },
  { label: 'Batches',         key: 'batch_count' },
  { label: 'Cubes Available', key: 'cubes_available' },
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    api.getDashboard().then(setData).catch(e => setError(e.message))
  }, [])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (error) return <div className="empty-state"><p style={{color:'var(--red)'}}>Failed to load: {error}</p></div>
  if (!data) return <div className="empty-state"><p>Loading…</p></div>

  const sortedQA = sortKey
    ? [...data.qaTargets].sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        const cmp = typeof av === 'number' || typeof bv === 'number'
          ? (Number(av) || 0) - (Number(bv) || 0)
          : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data.qaTargets

  return (
    <div>
      <div className="stats-grid">
        <Stat
          label="Recipes"
          value={data.totalRecipes}
          sub="Total formulas"
        />
        <Stat
          label="Batches"
          value={data.totalBatches}
          sub={data.brixMisses > 0 ? `${data.brixMisses} brix miss${data.brixMisses !== 1 ? 'es' : ''}` : 'All brix on target'}
          color={data.brixMisses > 0 ? 'var(--amber)' : undefined}
        />
        <Stat
          label="Freeze Log"
          value={data.totalFreezeTests}
          sub="Tests logged"
        />
        <Stat
          label="Avg Tasting Score"
          value={data.avgScore ?? '—'}
          sub="Out of 10"
          color={data.avgScore >= 7 ? 'var(--green)' : data.avgScore ? 'var(--amber)' : undefined}
        />
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Total Cubes
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1 }}>
            {data.cubesCreated}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{data.cubesTasted} tasted</span>
            <span style={{ color: data.cubesAvailable > 0 ? 'var(--accent)' : undefined }}>{data.cubesAvailable} available</span>
            {data.cubesRemoved > 0 && <span style={{ color: 'var(--text-tertiary)' }}>{data.cubesRemoved} removed</span>}
          </div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Bottles
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1 }}>
            {data.bottlesInStock ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: (data.bottlesInStock ?? 0) > 0 ? 'var(--accent)' : undefined }}>in stock</span>
            {(data.bottlesFilled ?? 0) > 0 && <span>{data.bottlesFilled} filled total</span>}
          </div>
        </div>
      </div>

      {data.recentBatches && data.recentBatches.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>Recent Batches</h2>
            <span className="text-muted text-sm">{data.totalBatches} total</span>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            {data.recentBatches.map(batch => (
              <div key={batch.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', borderBottom: 'var(--border-subtle)', gap: 12, flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{batch.expression || batch.sku}</span>
                  <span className="text-sm text-muted">{batch.batch_id || '—'} · {batch.sku}</span>
                  {batch.date && <span className="text-sm text-muted">{batch.date}</span>}
                  {batch.batch_size && (
                    <span className="text-sm text-muted">{batch.batch_size} {batch.batch_unit}</span>
                  )}
                </div>
                <BrixBar batch={batch} />
              </div>
            ))}
          </div>
        </div>
      )}

      {data.brixDist && data.brixDist.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>Brix On-Target Rate</h2>
            <span className="text-muted text-sm">Last 50 batches</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <BrixChart data={data.brixDist} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>QA Targets</h2>
          <span className="text-muted text-sm">{data.qaTargets.length} recipes</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {QA_COLS.map(col => (
                <th key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >
                  {col.label}
                  {sortKey === col.key
                    ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    : <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.3 }}>⇅</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedQA.map(r => {
              let lastCreatedDisplay = <span className="text-muted">—</span>
              if (r.last_batch_date) {
                const [y, m, d] = r.last_batch_date.split('-')
                const formatted = `${d}/${m}/${y}`
                const msPerDay = 86400000
                const daysAgo = Math.floor((Date.now() - new Date(r.last_batch_date).getTime()) / msPerDay)
                lastCreatedDisplay = <span>{formatted} <span className="text-muted">{daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}</span></span>
              }
              return (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.sku}</td>
                <td>{r.expression}</td>
                <td><Badge status={r.status} /></td>
                <td>{lastCreatedDisplay}</td>
                <td>
                  {r.brix_min != null
                    ? <span>{r.brix_min}–{r.brix_max} °Bx</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td>
                  {r.ph_min != null
                    ? <span>{r.ph_min}–{r.ph_max}</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td>
                  {r.melt_min != null
                    ? <span>{r.melt_min}–{r.melt_max} min</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{r.batch_count}</span>
                </td>
                <td>
                  {r.cubes_available > 0
                    ? <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.cubes_available}</span>
                    : <span className="text-muted">0</span>}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
