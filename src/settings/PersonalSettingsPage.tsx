import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'
import { DiscountPresetsForm } from './DiscountPresetsForm'
import { ProductAdditionsForm, type ProductAdditionType } from './ProductAdditionsForm'

type PersonalSettingsPageProps = {
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
  discountPresets: number[]
}

export function PersonalSettingsPage({
  preparationStages,
  productAdditionTypes,
  discountPresets,
}: PersonalSettingsPageProps) {
  return (
    <>
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <DiscountPresetsForm initialPercents={discountPresets} />
      <EmployeesTable />
    </>
  )
}
