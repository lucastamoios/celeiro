import React, { useEffect, useLayoutEffect } from "react"
import {
  ImageBackground,
  ImageStyle,
  Linking,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ActionButton } from "@/components/ActionButton"
import { useMobilityContext } from "@/features/mobility/mobilityContext"
import { MobilityStackScreenProps } from "@/navigators/MobilityNavigator"
import { Screen } from "@/components/Screen"
import { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { getGeolocationSystem } from "@/features/mobility/geolocation"

interface MobilityPrepareProps extends MobilityStackScreenProps<"MobilityPrepare"> {}
export function MobilityPrepareScreen(_props: MobilityPrepareProps) {
  const { navigation } = _props
  const insets = useSafeAreaInsets()
  const { rideUUID, locationGranted } = useMobilityContext()
  const { themed } = useAppTheme()

  useEffect(() => {
    void getGeolocationSystem()
  }, [])

  return (
    <Screen contentContainerStyle={themed($container)}>
      <ImageBackground
        source={require("@/assets/images/mobility-start-cover.jpeg")}
        style={[
          themed($backgroundImage),
          {
            paddingBottom: Platform.select({
              android: (insets?.bottom ?? 0) + 30,
              ios: insets?.bottom,
            }),
          },
        ]}
      >
        <View style={themed($buttonContainer)}>
          {!locationGranted ? (
            <ActionButton
              onPress={() => Linking.openSettings()}
              text={"Ativar Serviços de Localização"}
              style={themed($button)}
            />
          ) : (
            <>
              <ActionButton
                onPress={() => navigation.navigate("MobilityRun", { destination: "home" })}
                disabled={!rideUUID}
                text={"Ir para casa"}
                icon={"home"}
                style={themed($button)}
              />
              <ActionButton
                onPress={() => navigation.navigate("MobilityRun", { destination: "work" })}
                disabled={!rideUUID}
                text={"Ir para o trabalho"}
                icon={"building"}
                style={themed($button)}
              />
              <ActionButton
                onPress={() => navigation.navigate("MobilityRun", { destination: "free" })}
                disabled={!rideUUID}
                text={"Percurso livre"}
                icon={"location-arrow"}
                style={themed($button)}
                variant={"white"}
              />
            </>
          )}
        </View>
      </ImageBackground>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginTop: -25,
})

const $backgroundImage: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "flex-end",
  alignItems: "center",
})

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "transparent",
  width: "100%",
  paddingHorizontal: 8,
  flex: 1,
  justifyContent: "flex-end",
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: 10,
})
