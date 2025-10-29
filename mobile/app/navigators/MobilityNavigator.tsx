import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { Header } from "@/components/Header"
import { MobilityProvider } from "@/features/mobility/mobilityContext"
import { MobilityPrepareScreen } from "@/screens/mobility/MobilityPrepare"
import { MobilityRunScreen } from "@/screens/mobility/MobilityRun"
import { MobilityRunType } from "@/features/mobility/mobility-types"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 */
export type MobilityNavigatorParamList = {
  MobilityPrepare: undefined
  MobilityRun: { destination: MobilityRunType }
}

export type MobilityStackScreenProps<T extends keyof MobilityNavigatorParamList> =
  NativeStackScreenProps<MobilityNavigatorParamList, T>

const Stack = createNativeStackNavigator<MobilityNavigatorParamList>()

export const MobilityNavigator = () => {
  return (
    <MobilityProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="MobilityPrepare"
      >
        <Stack.Screen
          name="MobilityPrepare"
          options={{
            header: (props) => <Header {...props} title="Mobilidade Sustentável" />,
            headerShown: true,
          }}
          component={MobilityPrepareScreen}
        />
        <Stack.Screen
          name="MobilityRun"
          options={{
            header: (props) => <Header {...props} title="Mobilidade Sustentável" />,
            headerShown: false,
          }}
          component={MobilityRunScreen}
        />
      </Stack.Navigator>
    </MobilityProvider>
  )
}
