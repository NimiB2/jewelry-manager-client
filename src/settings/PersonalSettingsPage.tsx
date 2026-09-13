import { ConversionRatiosTable } from './ConversionRatiosTable'
import { CollectionsForm } from './CollectionsForm'
import { PreparationStagesForm } from './PreparationStagesForm'
import { EmployeesTable } from './EmployeesTable'

type PersonalSettingsPageProps = {
  preparationStages: string[]
}

export function PersonalSettingsPage({ preparationStages }: PersonalSettingsPageProps) {
  return (
    <>
      <ConversionRatiosTable />
      <CollectionsForm />
      <PreparationStagesForm initialStages={preparationStages} />
      <EmployeesTable />
    </>
  )
}
