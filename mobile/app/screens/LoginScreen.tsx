import { FC, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { colors } from "@/theme/colors"
import to from "@/utils/to"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = () => {
  const { themed } = useAppTheme()

  const [authenticationError, setAuthenticationError] = useState<string | null>(null)
  const [authPassword, setAuthPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    authEmail,
    setAuthEmail,
    validationError,
    loginWithPassword,
  } = useAuth()

  async function handleLogin() {
    if (validationError || authPassword.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setAuthenticationError(null)
    const [error, _] = await to(loginWithPassword(authEmail!, authPassword))
    setIsSubmitting(false)
    if (error) {
      setAuthenticationError(error.message)
    }
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      backgroundColor={colors.backgroundDark}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={themed($brandContainer)}>
        <View style={themed($brandMark)}>
          <Text style={themed($brandMarkText)}>C</Text>
        </View>
        <Text style={themed($brandName)}>Celeiro</Text>
      </View>

      <View style={themed($titleContainer)}>
        <Text style={themed($title)}>Entre na sua carteira</Text>
        <Text style={themed($subtitle)}>
          Use o mesmo email da sua conta para ver o resumo da familia.
        </Text>
      </View>

      <TextField
        value={authEmail}
        onChangeText={setAuthEmail}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        placeholder="Digite seu email"
        helper={authEmail ? validationError : undefined}
        status={authEmail && validationError ? "error" : undefined}
      />

      <TextField
        value={authPassword}
        onChangeText={setAuthPassword}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        label="Senha"
        placeholder="Digite sua senha"
        secureTextEntry
        onSubmitEditing={handleLogin}
      />

      {authenticationError && (
        <Text style={themed($errorText)}>{authenticationError}</Text>
      )}

      <Button
        testID="login-button"
        text={isSubmitting ? "Entrando..." : "Entrar"}
        style={themed($tapButton)}
        disabled={!!validationError || authPassword.length === 0 || isSubmitting}
        disabledStyle={themed($tapButtonDisabled)}
        preset="filled"
        onPress={handleLogin}
      />
    </Screen>
  )
}

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginBottom: 12,
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  justifyContent: "center",
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  backgroundColor: colors.primary,
})

const $tapButtonDisabled: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#D8D0CA",
  opacity: 0.7,
})

const $brandContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.sm,
  marginBottom: spacing.xxl,
})

const $brandMark: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  backgroundColor: colors.primary,
  borderRadius: 8,
  height: 44,
  justifyContent: "center",
  width: 44,
})

const $brandMarkText: ThemedStyle<TextStyle> = () => ({
  color: colors.foreground,
  fontSize: 24,
  fontWeight: "900",
})

const $brandName: ThemedStyle<TextStyle> = () => ({
  color: colors.textDark,
  fontSize: 34,
  fontWeight: "800",
})

const $titleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: colors.textDark,
  fontSize: 32,
  fontWeight: "800",
  marginBottom: spacing.xs,
})

const $subtitle: ThemedStyle<TextStyle> = () => ({
  color: colors.textDarkMuted,
  fontSize: 17,
  lineHeight: 24,
})
