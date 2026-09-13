import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { nameInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section } from './Section'

type Employee = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: 'SUPER_ADMIN' | 'OWNER' | 'EMPLOYEE'
}

const ROLE_LABELS: Record<Employee['role'], string> = {
  SUPER_ADMIN: 'מנהל על',
  OWNER: 'בעלים',
  EMPLOYEE: 'עובד',
}

const newEmployeeInputStyle = {
  ...nameInputStyle,
  textAlign: 'right' as const,
  border: '1px solid var(--border)',
  padding: '8px 10px',
  minHeight: 40,
}

export function EmployeesTable() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'OWNER' | 'EMPLOYEE'>('EMPLOYEE')
  const [busy, setBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function load() {
    apiFetch('/users')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setEmployees)
      .catch((err) => setError(String(err)))
  }

  useEffect(load, [])

  async function handleAdd() {
    if (!email.trim() || busy) return
    setBusy(true)
    setAddError(null)
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setName('')
      setEmail('')
      setPhone('')
      setRole('EMPLOYEE')
      setShowAddForm(false)
      load()
    } catch (err) {
      setAddError(String(err))
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <Section title="עובדים">
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>שגיאה: {error}</p>
      </Section>
    )
  }
  if (!employees) {
    return (
      <Section title="עובדים">
        <p style={statusTextStyle}>טוען עובדים...</p>
      </Section>
    )
  }

  return (
    <Section title="עובדים">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {employees.map((employee, index) => (
          <div
            key={employee.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '6px 0',
              borderBottom: index < employees.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div>
              <p style={{ fontSize: 14, color: 'var(--text)' }}>{employee.name ?? 'ללא שם'}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{employee.email}</p>
              {employee.phone && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{employee.phone}</p>
              )}
            </div>
            <span style={{ fontSize: 13, color: 'var(--accent)' }}>{ROLE_LABELS[employee.role]}</span>
          </div>
        ))}
      </div>

      {showAddForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם"
            aria-label="שם העובד"
            style={newEmployeeInputStyle}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל (חייב להתאים לחשבון Google שאיתו יתחברו)"
            aria-label="אימייל העובד"
            style={newEmployeeInputStyle}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="טלפון (לא חובה)"
            aria-label="טלפון העובד"
            style={newEmployeeInputStyle}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'OWNER' | 'EMPLOYEE')}
            aria-label="תפקיד"
            style={newEmployeeInputStyle}
          >
            <option value="EMPLOYEE">עובד</option>
            <option value="OWNER">בעלים</option>
          </select>

          {addError && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>שגיאה: {addError}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !email.trim()}
              style={{
                flex: 1,
                minHeight: 40,
                border: 'none',
                borderRadius: 8,
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              הוספה
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                minHeight: 40,
                padding: '0 16px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowAddForm(true)} style={addRowButtonStyle}>
          + הוספת עובד
        </button>
      )}
    </Section>
  )
}
