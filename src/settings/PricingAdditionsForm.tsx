import { apiFetch } from '../api'
import { TrashIcon } from '../icons/TrashIcon'
import { nameInputStyle, cellInputStyle, iconButtonStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'

type Item = { name: string; price: string }
type Category = { id: string; name: string; basePrice: string; items: Item[] }

export type PricingAdditionsRecord = {
  name: string
  basePrice: number
  items: { name: string; price: number }[]
}[]

function toCategories(record: PricingAdditionsRecord): Category[] {
  return record.map((cat) => ({
    id: crypto.randomUUID(),
    name: cat.name,
    basePrice: String(cat.basePrice ?? 0),
    items: cat.items.map((item) => ({ name: item.name, price: String(item.price) })),
  }))
}

function toRecord(categories: Category[]): PricingAdditionsRecord {
  return categories.map((cat) => ({
    name: cat.name.trim(),
    basePrice: Number(cat.basePrice) || 0,
    items: cat.items.map((item) => ({ name: item.name.trim(), price: Number(item.price) || 0 })),
  }))
}

function isValid(categories: Category[]): boolean {
  const names = categories.map((c) => c.name.trim())
  if (names.some((n) => n === '') || new Set(names).size !== names.length) return false
  return categories.every((cat) => {
    const itemNames = cat.items.map((i) => i.name.trim())
    return !itemNames.some((n) => n === '') && new Set(itemNames).size === itemNames.length
  })
}

async function save(categories: Category[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pricingAdditions: toRecord(categories) }),
  })
}

function categoryTotal(category: Category): number {
  return (Number(category.basePrice) || 0) + category.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
}

type PricingAdditionsFormProps = {
  initialAdditions: PricingAdditionsRecord
}

export function PricingAdditionsForm({ initialAdditions }: PricingAdditionsFormProps) {
  const initialCategories = toCategories(initialAdditions)
  const { value: categories, setValue: setCategories, status, valid, hasChanges, undo } = useAutosaveSection(
    initialCategories,
    save,
    isValid,
  )

  function updateCategoryName(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }

  function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  function addCategory() {
    setCategories((prev) => [...prev, { id: crypto.randomUUID(), name: '', basePrice: '', items: [] }])
  }

  function updateBasePrice(id: string, basePrice: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, basePrice } : c)))
  }

  function updateItem(categoryId: string, index: number, field: keyof Item, value: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, items: c.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) },
      ),
    )
  }

  function removeItem(categoryId: string, index: number) {
    setCategories((prev) =>
      prev.map((c) => (c.id !== categoryId ? c : { ...c, items: c.items.filter((_, i) => i !== index) })),
    )
  }

  function addItem(categoryId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id !== categoryId ? c : { ...c, items: [...c.items, { name: '', price: '' }] })),
    )
  }

  const grandTotal = categories.reduce((sum, cat) => sum + categoryTotal(cat), 0)

  return (
    <Section title="תוספות תמחור" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
        סה"כ תוספות: <span style={{ color: 'var(--accent)' }}>{grandTotal.toFixed(2)} ₪</span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((category) => (
          <div key={category.id} style={categoryCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <input
                type="text"
                value={category.name}
                onChange={(e) => updateCategoryName(category.id, e.target.value)}
                placeholder="לדוגמה: אריזה"
                aria-label="שם הקטגוריה"
                style={{ ...nameInputStyle, fontWeight: 600, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeCategory(category.id)}
                aria-label={`הסר את ${category.name || 'הקטגוריה'}`}
                style={{ ...iconButtonStyle, width: 28, height: 28 }}
              >
                <TrashIcon />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>מחיר בסיס:</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={category.basePrice}
                onChange={(e) => updateBasePrice(category.id, e.target.value)}
                placeholder="0"
                aria-label="מחיר בסיס לקטגוריה"
                style={{ ...cellInputStyle, width: 70 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                סה"כ קטגוריה: <span style={{ color: 'var(--accent)' }}>{categoryTotal(category).toFixed(2)} ₪</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {category.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 32px',
                    gap: 6,
                    alignItems: 'start',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 4,
                  }}
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(category.id, index, 'name', e.target.value)}
                    placeholder="שם הפריט"
                    aria-label="שם הפריט"
                    style={nameInputStyle}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(category.id, index, 'price', e.target.value)}
                    aria-label="מחיר הפריט"
                    style={cellInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(category.id, index)}
                    aria-label={`הסר את ${item.name || 'הפריט'}`}
                    style={{ ...iconButtonStyle, width: 28, height: 28 }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addItem(category.id)} style={{ ...addRowButtonStyle, marginTop: 6 }}>
              + הוספת פריט
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addCategory} style={addRowButtonStyle}>
        + הוספת קטגוריה
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל קטגוריה ולכל פריט בתוכה חייב להיות שם ייחודי — השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>
      )}
    </Section>
  )
}

const categoryCardStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 10,
}
