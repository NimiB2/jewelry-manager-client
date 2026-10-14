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

type PersonalSettingsPageProps = {
  expenseGroups: string[]
  taskCategories: string[]
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
  discountPresets: number[]
  testOrderPrefix: string
  expenseTypes: string[]
  expenseSuppliers: string[]
}

export function PersonalSettingsPage({
  expenseGroups,
  taskCategories,
  preparationStages,
  productAdditionTypes,
  discountPresets,
  testOrderPrefix,
  expenseTypes,
  expenseSuppliers,
}: PersonalSettingsPageProps) {
  return (
    <>
      <NotificationsCard />
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <NamedListForm
        field="expenseGroups"
        title="קבוצות הוצאה"
        description="הקבוצות הראשיות שההוצאות מתחלקות אליהן, למשל הוצאות הזמנות, עסק, בית."
        placeholder="לדוגמה: הוצאות בית"
        addLabel="+ הוספת קבוצה"
        initialNames={expenseGroups}
      />
      <ExpenseTypesForm initialTypes={expenseTypes} />
      <NamedListForm
        field="taskCategories"
        title="קטגוריות משימות"
        description="הקטגוריות שאפשר לשייך להן משימה כללית, למשל שיווק, חומרים."
        placeholder="לדוגמה: שיווק"
        addLabel="+ הוספת קטגוריה"
        initialNames={taskCategories}
      />
      <ExpenseSuppliersForm initialSuppliers={expenseSuppliers} />
      <DiscountPresetsForm initialPercents={discountPresets} />
      <TestOrderPrefixForm initialPrefix={testOrderPrefix} />
      <EmployeesTable />
    </>
  )
}
