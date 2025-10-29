import { TouchableOpacity, View, Text, ViewStyle, TextStyle } from "react-native"
import { ScoreDisplay } from "@/components/ScoreDisplay"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { NativeStackHeaderProps } from "@react-navigation/native-stack"
import { useAuth } from "@/context/AuthContext"
import { useGetMyTotalScore } from "@/services/api/queries"

export function HomeHeader(props: NativeStackHeaderProps) {
  const { themed, theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()

  const { data: score } = useGetMyTotalScore()

  return (
    <View style={[themed($header), { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={themed($headerRow)}>
        <View style={themed($headerLeft)}>
          <Text style={themed($greeting)}>Olá, {session?.user.name.split(" ")[0]}</Text>
        </View>
      </View>
      <View style={themed($headerRow)}>
        <View style={[themed($headerRow), { marginBottom: 10 }]}>
          <TouchableOpacity
            onPress={() => props.navigation.navigate("ScoreHistory")}
            style={themed($scoreContainer)}
          >
            <Text style={themed($scoreText)}>Sua pontuação</Text>
            <ScoreDisplay score={score?.data?.total_score ?? 0} />
          </TouchableOpacity>
        </View>
        <View style={themed($headerRight)}>
          <TouchableOpacity onPress={() => props.navigation.navigate("Leaderboard")}>
            <MaterialCommunityIcons name="crown-circle" size={30} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => props.navigation.navigate("Profile")}>
            <MaterialCommunityIcons name="account-circle" size={30} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const $header: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.backgroundDark,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  backgroundColor: "transparent",
  marginBottom: spacing.sm,
})

const $headerLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "transparent",
  gap: spacing.xs,
  flex: 1,
})

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "transparent",
  gap: spacing.sm,
})

const $greeting: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDark,
  fontSize: 36,
  fontWeight: "800",
})

const $scoreContainer: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "transparent",
  flexDirection: "row",
  alignItems: "center",
})

const $scoreText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  marginRight: spacing.xs,
})
