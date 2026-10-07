import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { type MaterialsRecord } from './MaterialsForm'
import { type PricingAdditionsRecord } from './PricingAdditionsForm'
import { type FeesItemsRecord } from './FeesForm'
import { PricingSettingsPage } from './PricingSettingsPage'
import { PersonalSettingsPage } from './PersonalSettingsPage'
import { type ProductAdditionType } from './ProductAdditionsForm'

type SettingsData = {
  materials?: MaterialsRecord
  laborHourRate?: number
  feesItems?: FeesItemsRecord
  profitFloorPercent?: number
  pricingAdditions?: PricingAdditionsRecord
  preparationStages?: string[]
  productAdditionTypes?: ProductAdditionType[]
  discountPresets?: number[]
  testOrderPrefix?: string
}

type SettingsRow = {
  id: string
  businessId: string
  data: SettingsData
}

type Tab = 'pricing' | 'personal'

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pricing')

  useEffect(() => {
    apiFetch('/settings')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setSettings)
      .catch((err) => setError(String(err)))
  }, [])

  if (error) return <p>שגיאה בטעינת ההגדרות: {error}</p>
  if (!settings) return <p>טוען הגדרות...</p>

  return (
    <div className="settings-page">
      <h1 style={{ fontSize: 28, margin: '8px 0 20px' }}>הגדרות</h1>

      <div style={segmentedControlStyle}>
        <button
          type="button"
          onClick={() => setTab('pricing')}
          style={{ ...segmentButtonStyle, ...(tab === 'pricing' ? segmentButtonActiveStyle : {}) }}
        >
          תמחור
        </button>
        <button
          type="button"
          onClick={() => setTab('personal')}
          style={{ ...segmentButtonStyle, ...(tab === 'personal' ? segmentButtonActiveStyle : {}) }}
        >
          הגדרות אישיות
        </button>
      </div>

      {/* Both tabs stay mounted and are only hidden: unmounting would rebuild the forms from
          the settings fetched at page load, hiding anything edited since. */}
      <div hidden={tab !== 'pricing'}>
        <PricingSettingsPage
          materials={settings.data.materials ?? {}}
          laborHourRate={settings.data.laborHourRate ?? 0}
          feesItems={settings.data.feesItems ?? []}
          profitFloorPercent={settings.data.profitFloorPercent ?? 0}
          pricingAdditions={settings.data.pricingAdditions ?? []}
        />
      </div>
      <div hidden={tab !== 'personal'}>
        <PersonalSettingsPage
          preparationStages={settings.data.preparationStages ?? []}
          productAdditionTypes={settings.data.productAdditionTypes ?? []}
          discountPresets={settings.data.discountPresets ?? []}
          testOrderPrefix={settings.data.testOrderPrefix ?? ''}
        />
      </div>
    </div>
  )
}

const segmentedControlStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  background: 'var(--border)',
  borderRadius: 10,
  padding: 4,
  marginBottom: 20,
}

const segmentButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 36,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

const segmentButtonActiveStyle: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text)',
  fontWeight: 600,
}
