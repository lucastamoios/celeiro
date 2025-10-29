import React from "react";
import { Text, TextStyle, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

export function DefaultHeaderTitle(props: { title: string; subtitle: string }) {
  const { themed } = useAppTheme();

  return (
    <View style={themed($container)}>
      <Text style={themed($title)}>{props.title}</Text>
      <Text style={themed($subtitle)}>{props.subtitle}</Text>
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "transparent",
  marginBottom: spacing.md,
});

const $title: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDark,
  fontSize: 30,
  fontWeight: "800",
  marginBottom: spacing.xs,
});

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDarkMuted,
  fontSize: 18,
});
