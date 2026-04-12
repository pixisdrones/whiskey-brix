import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Stat from './shared/Stat.jsx'
import Badge from './shared/Badge.jsx'
import SectionHeader from './shared/SectionHeader.jsx'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getDashboard().then(setData).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="empty-state"><p style={{color:'var(--red)'}}>Failed to load: {error}</p></div>
  if (!data) return <div className="empty-state"><p>Loading…</p></div>

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
          label="Freeze Tests"
          value={data.totalFreezeTests}
          sub={data.meltIssues > 0 ? `${data.meltIssues} melt issue${data.meltIssues !== 1 ? 's' : ''}` : 'All melt on target'}
          color={data.meltIssues > 0 ? 'var(--red)' : undefined}
        />
        <Stat
          label="Avg Tasting Score"
          value={data.avgScore ?? '—'}
          sub="Out of 10"
          color={data.avgScore >= 7 ? 'var(--green)' : data.avgScore ? 'var(--amber)' : undefined}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>QA Targets</h2>
          <span className="text-muted text-sm">{data.qaTargets.length} recipes</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Expression</th>
              <th>Status</th>
              <th>Spirit Pairing</th>
              <th>Brix Target</th>
              <th>pH Target</th>
              <th>Melt Window</th>
              <th>Batches</th>
            </tr>
          </thead>
          <tbody>
            {data.qaTargets.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.sku}</td>
                <td>{r.expression}</td>
                <td><Badge status={r.status} /></td>
                <td>{r.spirit_pairing ?? <span className="text-muted">—</span>}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
