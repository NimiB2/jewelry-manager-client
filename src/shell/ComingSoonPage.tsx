export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="screen">
      <h1>{title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>המסך הזה עוד לא נבנה.</p>
    </div>
  )
}
