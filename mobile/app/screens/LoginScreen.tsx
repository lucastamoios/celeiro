import { FC, useRef, useState, useEffect } from "react"
// eslint-disable-next-line no-restricted-imports
import { ImageStyle, TextInput, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { DefaultHeaderTitle } from "@/components/DefaultHeaderTitle"
import { Image } from "expo-image";
import { colors } from "@/theme/colors"
import to from "@/utils/to"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = () => {
  const { themed } = useAppTheme()

  const authPasswordInput = useRef<TextInput>(null)
  const [authenticationError, setAuthenticationError] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const {
    authEmail,
    setAuthEmail,
    validationError,
    requestMagicLink,
    authenticate,
    step,
    authCode,
    setAuthCode,
  } = useAuth()

  // Timer effect for resend functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendTimer])

  // Start timer when entering validate step
  useEffect(() => {
    if (step === "validate") {
      setResendTimer(60) // 60 seconds cooldown
      setCanResend(false)
      setAuthenticationError(null) // Clear any previous errors
    }
  }, [step])

  async function handleLogin() {
    const [error, _] = await to(requestMagicLink(authEmail!))
    if (error) {
      setAuthenticationError(error.message)
    }
  }

  async function handleResendMagicLink() {
    if (!canResend) return
    
    const [error, _] = await to(requestMagicLink(authEmail!))
    if (error) {
      setAuthenticationError(error.message)
    } else {
      setResendTimer(60) // Reset timer to 60 seconds
      setCanResend(false)
      setAuthenticationError(null)
    }
  }

  async function handleAuthenticate() {
    if (authCode.length === 0) return
    const [error, _] = await to(authenticate(authEmail!, authCode))
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
       <View style={themed($logoContainer)}>
          <Image
            contentFit={"contain"}
            contentPosition={"center"}
            source={require("../assets/images/logo.svg")}
            style={themed($logo)}
          />
        </View>
        <DefaultHeaderTitle
          title="Entre com sua conta"
          subtitle="Informe seus dados de acesso"
        />
      {step === "request" && (
        <>
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
            helper={validationError}
            status={validationError ? "error" : undefined}
            onSubmitEditing={() => authPasswordInput.current?.focus()}
          />

          {authenticationError && (
            <Text style={themed($errorText)}>{authenticationError}</Text>
          )}

          <Button
            testID="login-button"
            text="Entrar"
            style={themed($tapButton)}
            preset="filled"
            onPress={handleLogin}
          />
        </>
      )}
      {step === "validate" && (
        <>
          <Text
            testID="login-heading"
            tx="loginScreen:logIn"
            preset="heading"
            style={themed($logIn)}
          />
          <Text tx="loginScreen:validateCode" preset="subheading" style={themed($enterDetails)} />

          <TextField
            value={authCode}
            onChangeText={setAuthCode}
            containerStyle={themed($textField)}
            keyboardType="number-pad"
            maxLength={4}
          />

          {authenticationError && (
            <Text style={themed($errorText)}>{authenticationError}</Text>
          )}

          <Button
            testID="login-button"
            tx="loginScreen:tapToLogIn"
            style={themed($tapButton)}
            preset="filled"
            onPress={handleAuthenticate}
          />

          <View style={themed($resendContainer)}>
            {canResend ? (
              <Button
                text="Reenviar código"
                style={themed($resendButton)}
                preset="default"
                onPress={handleResendMagicLink}
              />
            ) : (
              <Text style={themed($resendTimer)}>
                Reenviar código em {resendTimer}s
              </Text>
            )}
          </View>
        </>
      )}
    </Screen>
  )
}

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginBottom: 12,
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $logIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: colors.textDark,
  marginBottom: spacing.lg,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $logo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  height: 80,
  width: "auto",
  flex: 1,
  marginBottom: spacing.lg,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "transparent",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 12,
  flexDirection: "row",
  gap: 10,
  color: "white",
  width: "100%",
})

const $resendContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  alignItems: "center",
})

const $resendButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $resendTimer: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.xs,
})
