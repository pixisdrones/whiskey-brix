export default function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: color ?? 'var(--text)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
