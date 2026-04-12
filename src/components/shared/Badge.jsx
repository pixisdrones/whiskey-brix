export default function Badge({ status }) {
  const cls = {
    active: 'badge badge-active',
    experimental: 'badge badge-experimental',
    archived: 'badge badge-archived',
  }[status] ?? 'badge badge-archived'
  return <span className={cls}>{status}</span>
}
