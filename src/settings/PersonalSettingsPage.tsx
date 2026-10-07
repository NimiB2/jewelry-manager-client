import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'
import { DiscountPresetsForm } from './DiscountPresetsForm'
import { ProductAdditionsForm, type ProductAdditionType } from './ProductAdditionsForm'
import { TestOrderPrefixForm } from './TestOrderPrefixForm'

type PersonalSettingsPageProps = {
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
  discountPresets: number[]
  testOrderPrefix: string
}

export function PersonalSettingsPage({
  preparationStages,
  productAdditionTypes,
  discountPresets,
  testOrderPrefix,
}: PersonalSettingsPageProps) {
  return (
    <>
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <DiscountPresetsForm initialPercents={discountPresets} />
      <TestOrderPrefixForm initialPrefix={testOrderPrefix} />
      <EmployeesTable />
    </>
  )
}
