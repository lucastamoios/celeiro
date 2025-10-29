import MobilityModule from "@/features/mobility/MobilityModule"
import { MobilityStackScreenProps } from "@/navigators/MobilityNavigator"
import { Screen } from "@/components/Screen"
import { useMobilityContext } from "@/features/mobility/mobilityContext"

interface MobilityRunProps extends MobilityStackScreenProps<"MobilityRun"> {}
export function MobilityRunScreen(_props: MobilityRunProps) {
  const { destination } = _props.route.params
  const { getDestination } = useMobilityContext()

  return (
    <Screen>
      <MobilityModule destination={getDestination(destination)} navigation={_props.navigation} />
    </Screen>
  )
}
