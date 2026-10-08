import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'
import { DiscountPresetsForm } from './DiscountPresetsForm'
import { ProductAdditionsForm, type ProductAdditionType } from './ProductAdditionsForm'
import { TestOrderPrefixForm } from './TestOrderPrefixForm'
import { ExpenseTypesForm } from './ExpenseTypesForm'
import { ExpenseSuppliersForm } from './ExpenseSuppliersForm'

type PersonalSettingsPageProps = {
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
  discountPresets: number[]
  testOrderPrefix: string
  expenseTypes: string[]
  expenseSuppliers: string[]
}

export function PersonalSettingsPage({
  preparationStages,
  productAdditionTypes,
  discountPresets,
  testOrderPrefix,
  expenseTypes,
  expenseSuppliers,
}: PersonalSettingsPageProps) {
  return (
    <>
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <ExpenseTypesForm initialTypes={expenseTypes} />
      <ExpenseSuppliersForm initialSuppliers={expenseSuppliers} />
      <DiscountPresetsForm initialPercents={discountPresets} />
      <TestOrderPrefixForm initialPrefix={testOrderPrefix} />
      <EmployeesTable />
    </>
  )
}
