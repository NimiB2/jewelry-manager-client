import { useEffect, useState } from 'react'
import { apiJson } from '../api'
import type { FinanceList } from '../finances/types'
import { monthName, periodRange } from '../orders/dates'
import type { OrdersList } from '../orders/types'
import { formatMoney } from '../products/format'
import { cardStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import { navigate } from '../shell/useRoute'
import type { Task } from '../tasks/types'

type HomeData = {
  netProfit: number | null
  activeOrders: number | null
  openTasks: number | null
}

type HomePageProps = {
  userEmail: string | null
  onSignOut: () => void
}

// The landing screen: the three numbers she checks most, each a shortcut to its screen.
export function HomePage({ userEmail, onSignOut }: HomePageProps) {
  const [data, setData] = useState<HomeData | null>(null)
  const now = new Date()

  useEffect(() => {
    const range = periodRange(now.getFullYear(), now.getMonth() + 1)
    const params = new URLSearchParams({ from: range!.from, to: range!.to })

    // Each number loads on its own, so one failing call doesn't blank the whole screen.
    Promise.allSettled([
      apiJson<FinanceList>(`/finances?${params}`),
      apiJson<OrdersList>('/orders?status=active'),
      apiJson<Task[]>('/tasks'),
    ]).then(([finances, orders, tasks]) =>
      setData({
        netProfit: finances.status === 'fulfilled' ? finances.value.summary.netProfit : null,
        activeOrders: orders.status === 'fulfilled' ? orders.value.summary.count : null,
        openTasks: tasks.status === 'fulfilled' ? tasks.value.filter((t) => t.status !== 'COMPLETED').length : null,
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 4px' }}>שלום</h1>
      <p style={{ ...mutedTextStyle, fontSize: 14, marginBottom: 16 }}>מה קורה בעסק היום</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StatCard
          label={`רווח נקי · ${monthName(now.getMonth() + 1)}`}
          value={data?.netProfit == null ? '...' : formatMoney(data.netProfit)}
          tone={data?.netProfit != null && data.netProfit < 0 ? 'var(--danger)' : 'var(--success)'}
          ltr
          onClick={() => navigate('/finances')}
        />
        <StatCard
          label="הזמנות פעילות"
          value={data?.activeOrders == null ? '...' : String(data.activeOrders)}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          label="משימות פתוחות"
          value={data?.openTasks == null ? '...' : String(data.openTasks)}
          onClick={() => navigate('/tasks')}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => navigate('/orders/new')} style={{ ...primaryButtonStyle, flex: 1 }}>
          + הזמנה חדשה
        </button>
        <button type="button" onClick={() => navigate('/tasks')} style={{ ...secondaryButtonStyle, flex: 1 }}>
          המשימות שלי
        </button>
      </div>

      <div className="home-account" style={{ ...cardStyle, marginTop: 24, textAlign: 'center' }}>
        <div style={mutedTextStyle}>מחוברת כ-{userEmail}</div>
        <button type="button" onClick={onSignOut} style={signOutStyle}>
          התנתקות
        </button>
      </div>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: string
  tone?: string
  // Money keeps its minus sign before the number.
  ltr?: boolean
  onClick: () => void
}

function StatCard({ label, value, tone = 'var(--text)', ltr, onClick }: StatCardProps) {
  return (
    <button type="button" onClick={onClick} style={{ ...cardStyle, ...statCardStyle }}>
      <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{label}</span>
      <span dir={ltr ? 'ltr' : undefined} style={{ fontSize: 26, fontWeight: 700, color: tone }}>
        {value}
      </span>
    </button>
  )
}

const statCardStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  border: 'none',
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
  padding: '16px',
}

const signOutStyle: React.CSSProperties = {
  marginTop: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 15,
  cursor: 'pointer',
}
