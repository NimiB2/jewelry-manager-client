import { MaterialsForm, type MaterialsRecord } from './MaterialsForm'
import { PricingAdditionsForm, type PricingAdditionsRecord } from './PricingAdditionsForm'
import { FeesForm, type FeesItemsRecord } from './FeesForm'
import { NumberFieldsForm } from './NumberFieldsForm'
import { PricingFormulaEditor } from './PricingFormulaEditor'

type PricingSettingsPageProps = {
  materials: MaterialsRecord
  laborHourRate: number
  feesItems: FeesItemsRecord
  profitFloorPercent: number
  pricingAdditions: PricingAdditionsRecord
}

export function PricingSettingsPage({
  materials,
  laborHourRate,
  feesItems,
  profitFloorPercent,
  pricingAdditions,
}: PricingSettingsPageProps) {
  return (
    <>
      <FeesForm initialItems={feesItems} />

      <MaterialsForm initialMaterials={materials} />

      <NumberFieldsForm
        title="תעריף שעתי"
        fields={[{ key: 'laborHourRate', label: 'תעריף שעתי (₪)', step: '1' }]}
        initialData={{ laborHourRate }}
      />

      <PricingAdditionsForm initialAdditions={pricingAdditions} />

      <NumberFieldsForm
        title="רצפת רווח"
        fields={[{ key: 'profitFloorPercent', label: 'רצפת רווח מינימלית (%)', step: '1' }]}
        initialData={{ profitFloorPercent }}
      />

      <PricingFormulaEditor />
    </>
  )
}
