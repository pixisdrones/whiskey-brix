import { useEffect, useState } from 'react'
import { api } from '../api.js'
import SectionHeader from './shared/SectionHeader.jsx'
import Field from './shared/Field.jsx'

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const ALCOHOL_FREQS = [
  'Daily',
  '4–5x per week',
  '2–3x per week',
  '1x per week',
  '2–3x per month',
  '1x per month',
  'Rarely / Socially',
]

function calcAge(dob) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function TesterForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    first_name: '', last_name: '', gender: '', dob: '',
    email: '', zip_code: '', alcohol_freq: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const age = calcAge(form.dob)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      ...form,
      gender: form.gender || null,
      dob: form.dob || null,
      email: form.email || null,
      zip_code: form.zip_code || null,
      alcohol_freq: form.alcohol_freq || null,
    })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 16 }}>{initial ? 'Edit Tester' : 'Add Tester'}</h3>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="First Name *">
          <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" />
        </Field>
        <Field label="Last Name *">
          <input required value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">— select —</option>
            {GENDERS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
        </Field>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <Field label="Date of Birth">
          <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
        </Field>
        <Field label="Age (auto)">
          <div style={{ padding: '8px 0', fontSize: 14, fontWeight: 700, color: age != null ? 'var(--text)' : 'var(--text-tertiary)' }}>
            {age != null ? age : '—'}
          </div>
        </Field>
        <Field label="Zip Code">
          <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="90210" />
        </Field>
        <Field label="Alcohol Consumption Frequency">
          <select value={form.alcohol_freq} onChange={e => set('alcohol_freq', e.target.value)}>
            <option value="">— select —</option>
            {ALCOHOL_FREQS.map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex gap-8 mt-16">
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add tester'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function TestersView() {
  const [testers, setTesters] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.getTesters().then(setTesters).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateTester(editing.id, payload)
    } else {
      await api.createTester(payload)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleEdit = (tester) => {
    setEditing(tester)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this tester?')) return
    await api.deleteTester(id)
    load()
  }

  const handleCancel = () => { setShowForm(false); setEditing(null) }

  return (
    <div>
      <SectionHeader
        title="Testers"
        action={
          <button
            className={`form-toggle-btn${showForm ? ' open' : ''}`}
            onClick={() => { setShowForm(s => !s); if (editing) setEditing(null) }}
          >
            {showForm && !editing ? '✕ Cancel' : '+ Add Tester'}
          </button>
        }
      />

      {showForm && (
        <TesterForm initial={editing} onSave={handleSave} onCancel={handleCancel} />
      )}

      {loading ? (
        <div className="empty-state"><p>Loading…</p></div>
      ) : testers.length === 0 ? (
        <div className="empty-state">
          <p>No testers yet.</p>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>Add testers here to link them to tastings and track their average scores.</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Age</th>
                <th>Email</th>
                <th>Zip</th>
                <th>Drink Frequency</th>
                <th>Tastings</th>
                <th>Avg Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {testers.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                  <td className="text-muted text-sm">{t.gender ?? '—'}</td>
                  <td className="text-muted text-sm">{t.dob ?? '—'}</td>
                  <td className="text-muted text-sm">{calcAge(t.dob) ?? '—'}</td>
                  <td className="text-muted text-sm">{t.email ?? '—'}</td>
                  <td className="text-muted text-sm">{t.zip_code ?? '—'}</td>
                  <td className="text-muted text-sm">{t.alcohol_freq ?? '—'}</td>
                  <td className="text-muted text-sm">{t.tasting_count ?? 0}</td>
                  <td>
                    {t.avg_score != null
                      ? <span style={{ fontWeight: 600, color: t.avg_score >= 7 ? 'var(--green)' : t.avg_score >= 5 ? 'var(--amber)' : 'var(--red)' }}>{t.avg_score}/10</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" onClick={() => handleEdit(t)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
