import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'
import { ProductAdditionsForm, type ProductAdditionType } from './ProductAdditionsForm'

type PersonalSettingsPageProps = {
  preparationStages: string[]
  productAdditionTypes: ProductAdditionType[]
}

export function PersonalSettingsPage({ preparationStages, productAdditionTypes }: PersonalSettingsPageProps) {
  return (
    <>
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <ProductAdditionsForm initialTypes={productAdditionTypes} />
      <EmployeesTable />
    </>
  )
}
