import React from "react"
import {
  ImageBackground,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Screen } from "@/components/Screen"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface HomeScreenProps extends AppStackScreenProps<"Home"> {}
export default function HomeScreen(_props: HomeScreenProps) {
  const { navigation } = _props
  const { themed } = useAppTheme()

  return (
    <Screen contentContainerStyle={themed($scrollViewContent)}>
      <ModuleButton
        name={"Mobilidade sustentável"}
        cta={"BETA"}
        onPress={() => navigation.navigate("Mobility", { screen: "MobilityPrepare" })}
        img={require("../assets/images/mobility-banner.png")}
      />
      <ModuleButton
        // cta={"Reciclar"}
        name={"Recicle o seu material"}
        cta={"BETA"}
        disabled={true}
        img={require("../assets/images/recycle-banner.jpeg")}
      />
      <ModuleButton
        // name={"Visite uma instituição de caridade"}
        cta={"Visitar"}
        disabled={true}
        img={require("../assets/images/visiting-banner.png")}
      />
      <ModuleButton
        // name={"Faça uma doação a uma instituição"}
        cta={"Doar"}
        disabled={true}
        img={require("../assets/images/donation-banner.png")}
      />
    </Screen>
  )
}

interface ModuleButtonProps {
  name?: string
  cta: string
  img: ImageSourcePropType
  disabled?: boolean
  onPress?: () => void
}

function ModuleButton(props: ModuleButtonProps) {
  const { themed } = useAppTheme()

  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={props.disabled}
      style={[themed($moduleButton), { opacity: props.disabled ? 0.75 : 1 }]}
    >
      <ImageBackground source={props.img} style={themed($moduleBackground)} resizeMode={"cover"}>
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={["rgba(0,0,0,0.99)", "transparent"]}
          style={themed($gradientBackground)}
        />
        <View style={themed($moduleContent)}>
          <Text style={themed($moduleName)}>{props.name ?? "Em breve"}</Text>
          {!props.disabled ? (
            <View style={themed($ctaContainer)}>
              <Text style={themed($ctaText)}>{props.cta}</Text>
            </View>
          ) : null}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  )
}

const $scrollViewContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
})

const $moduleButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "transparent",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: spacing.sm,
})

const $moduleBackground: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  minHeight: 130,
})

const $gradientBackground: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  height: 300,
})

const $moduleContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-start",
  justifyContent: "center",
  paddingLeft: spacing.lg,
  backgroundColor: "transparent",
  width: "50%",
})

const $moduleName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDark,
  fontSize: 18,
  fontWeight: "900",
  lineHeight: 24,
  marginBottom: spacing.xs,
})

const $ctaContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primary,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xs,
  borderRadius: 9999,
})

const $ctaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "800",
})
