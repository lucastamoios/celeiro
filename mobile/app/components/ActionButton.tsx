import { ActivityIndicator, StyleProp, Text, TextStyle, TouchableOpacity, ViewStyle } from "react-native"
import { FontAwesome } from "@expo/vector-icons"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type ButtonVariant = "primary" | "black" | "white" | "gray"

interface ActionButtonProps {
  onPress: () => void
  text: string
  loading?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  iconStyle?: StyleProp<TextStyle>
  disabled?: boolean
  icon?: string
  variant?: ButtonVariant
}

export function ActionButton({
  onPress,
  text,
  loading,
  style,
  textStyle,
  iconStyle,
  disabled,
  icon,
  variant = "primary",
}: ActionButtonProps) {
  const { themed } = useAppTheme()

  return (
    <TouchableOpacity
      style={[
        themed($button),
        themed($buttonVariant(variant)),
        style,
        { opacity: disabled ? 0.5 : 1 }
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <Text style={[themed($buttonText), themed($buttonTextVariant(variant)), textStyle]}>
        {text}
      </Text>
      {icon && (
        <FontAwesome 
          name={icon as "search"} 
          size={20} 
          style={[themed($icon), iconStyle]} 
        />
      )}
      {loading && (
        <ActivityIndicator 
          style={themed($activityIndicator)} 
          color={themed($loadingColor(variant))} 
        />
      )}
    </TouchableOpacity>
  )
}

const $button: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  borderRadius: 9999,
  paddingVertical: 12,
})

const $buttonVariant = (variant: ButtonVariant): ThemedStyle<ViewStyle> => ({ colors }) => {
  switch (variant) {
    case "primary":
      return { backgroundColor: colors.primary }
    case "black":
      return { backgroundColor: colors.backgroundDark }
    case "white":
      return { backgroundColor: colors.background }
    case "gray":
      return { backgroundColor: colors.backgroundSecondary }
    default:
      return { backgroundColor: colors.primary }
  }
}

const $buttonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
  fontWeight: "bold",
  textAlign: "center",
})

const $buttonTextVariant = (variant: ButtonVariant): ThemedStyle<TextStyle> => ({ colors }) => {
  switch (variant) {
    case "primary":
      return { color: colors.text }
    case "black":
      return { color: colors.textDark }
    case "white":
      return { color: colors.text }
    case "gray":
      return { color: colors.text }
    default:
      return { color: colors.text }
  }
}

const $icon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
})

const $activityIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
})

const $loadingColor = (variant: ButtonVariant): ThemedStyle<string> => ({ colors }) => {
  switch (variant) {
    case "black":
      return colors.textDark
    default:
      return colors.text
  }
}
