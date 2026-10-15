import { useState } from 'react'
import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'
import { DiscountPresetsForm } from './DiscountPresetsForm'
import { ProductAdditionsForm, type ProductAdditionType } from './ProductAdditionsForm'
import { TestOrderPrefixForm } from './TestOrderPrefixForm'
import { ExpenseTypesForm } from './ExpenseTypesForm'
import { ExpenseSuppliersForm } from './ExpenseSuppliersForm'
import { NotificationsCard } from './NotificationsCard'
import { NamedListForm } from './NamedListForm'
import { SectionAccordion, SectionGroupTitle } from './Section'

type PersonalSettingsPageProps = {
  expenseGroups: string[]
  taskCategories: string[]
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
  discountPresets: number[]
  testOrderPrefix: string
  expenseTypes: string[]
  expenseTypeGroups: Record<string, string>
  expenseSuppliers: string[]
}

// Closed rows in three groups, one open at a time, so the page stays short however long a list gets.
export function PersonalSettingsPage({
  expenseGroups,
  taskCategories,
  preparationStages,
  productAdditionTypes,
  discountPresets,
  testOrderPrefix,
  expenseTypes,
  expenseTypeGroups,
  expenseSuppliers,
}: PersonalSettingsPageProps) {
  // The group list as she edits it, so a new group is a choice for the categories right away.
  const [groups, setGroups] = useState(expenseGroups)

  return (
    <SectionAccordion>
      <SectionGroupTitle>כספים</SectionGroupTitle>
      <NamedListForm
        field="expenseGroups"
        title="קבוצות הוצאה"
        description="הקבוצות הראשיות שההוצאות מתחלקות אליהן, למשל הוצאות הזמנות, עסק, בית."
        placeholder="לדוגמה: הוצאות בית"
        addLabel="+ הוספת קבוצה"
        initialNames={expenseGroups}
        onNamesChange={setGroups}
      />
      <ExpenseTypesForm initialTypes={expenseTypes} initialGroups={expenseTypeGroups} groups={groups} />
      <ExpenseSuppliersForm initialSuppliers={expenseSuppliers} />

      <SectionGroupTitle>הזמנות ומוצרים</SectionGroupTitle>
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <ConversionRatiosTable />
      <DiscountPresetsForm initialPercents={discountPresets} />
      <TestOrderPrefixForm initialPrefix={testOrderPrefix} />

      <SectionGroupTitle>כללי</SectionGroupTitle>
      <NotificationsCard />
      <NamedListForm
        field="taskCategories"
        title="קטגוריות משימות"
        description="הקטגוריות שאפשר לשייך להן משימה כללית, למשל שיווק, חומרים."
        placeholder="לדוגמה: שיווק"
        addLabel="+ הוספת קטגוריה"
        initialNames={taskCategories}
      />
      <EmployeesTable />
    </SectionAccordion>
  )
}
