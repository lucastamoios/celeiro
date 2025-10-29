import React, { Fragment } from "react"
import { Platform, Text, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/context/AuthContext"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Screen } from "@/components/Screen"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}
export default function ProfileScreen(_props: ProfileScreenProps) {
  const insets = useSafeAreaInsets()
  const { logout, session, activeOrganization } = useAuth()
  const { themed } = useAppTheme()

  const profileData = [
    {
      title: "Informações do usuário",
      sections: [
        {
          title: "Nome",
          value: session?.user.name,
          type: null,
        },
        {
          title: "E-mail",
          value: session?.user.email,
          type: null,
        },
        // {
        //   title: "Telefone",
        //   value: session?.user_phone,
        //   type: null,
        // },
      ],
    },
    {
      title: "Endereço",
      sections: [
        {
          title: "Endereço",
          value: session?.user.address,
        },
        {
          title: "Trabalho",
          value: activeOrganization?.address,
        },
      ],
    },
  ]

  return (
    <Screen
      contentContainerStyle={[
        themed($scrollViewContent),
        {
          paddingTop: Platform.select({
            android: (insets?.top ?? 0) + 30,
            ios: insets?.top,
          }),
          paddingBottom: Platform.select({
            android: (insets?.bottom ?? 0) + 30,
            ios: insets?.bottom,
          }),
        },
      ]}
    >
      {profileData.map((d) => (
        <Fragment key={d.title}>
          <Text style={themed($sectionTitle)}>{d.title}</Text>
          {d.sections.map((s) => (
            <Fragment key={d.title + s.title}>
              <Text style={themed($itemTitle)}>{s.title}</Text>
              <Text style={themed($itemValue)}>{s.value || "-"}</Text>
            </Fragment>
          ))}
          <View style={themed($divider)} />
        </Fragment>
      ))}
      <TouchableOpacity
        onPress={() => {
          logout()
          console.log("Navigate to Login")
        }}
        style={themed($signOutButton)}
      >
        <Text style={themed($signOutText)}>Sair da conta</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          console.log("Delete account requested")
          // const tenant = "TODO"
          // openLinkInBrowser(`https://${tenant}.ecorpesg.com.br/remover-conta`)
        }}
      >
        <Text style={themed($deleteAccountText)}>Apagar Conta e Dados</Text>
      </TouchableOpacity>
    </Screen>
  )
}

const $scrollViewContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xl,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontWeight: "bold",
  marginBottom: spacing.sm,
})

const $itemTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: spacing.xs,
})

const $itemValue: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginBottom: spacing.sm,
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 2,
  borderColor: colors.separator,
  marginTop: spacing.sm,
  marginBottom: spacing.md,
})

const $signOutButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xxxl + spacing.xl, // 90px equivalent
})

const $signOutText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontWeight: "bold",
  textAlign: "center",
})

const $deleteAccountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontWeight: "bold",
  textAlign: "center",
})
