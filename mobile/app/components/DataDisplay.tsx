import React, { Fragment } from "react";
import { Text, View, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

interface DataDisplayProps {
  items: {
    label: string;
    value: string;
    icon: any;
  }[];
}

export function DataDisplay(props: DataDisplayProps) {
  const { themed } = useAppTheme();

  return (
    <View style={themed($container)}>
      {props.items.map((it, i) => (
        <Fragment key={it.label}>
          <View style={themed($itemContainer)}>
            <View style={themed($labelContainer)}>
              <Image source={it.icon} style={$icon} />
              <Text style={themed($label)}>{it.label}</Text>
            </View>
            <Text style={themed($value)}>{it.value}</Text>
          </View>
          {i !== props.items.length - 1 && <View style={themed($separator)} />}
        </Fragment>
      ))}
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.sm,
  borderWidth: 2,
  borderColor: colors.backgroundSecondary,
  borderStyle: "solid",
  borderRadius: 8,
  marginBottom: spacing.md,
  width: "100%",
});

const $itemContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $labelContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $icon: ImageStyle = {
  height: 20,
  width: 20,
  marginRight: 15,
};

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
});

const $value: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textMuted,
});

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 2,
  borderColor: colors.backgroundSecondary,
  borderStyle: "solid",
  marginVertical: spacing.sm,
});
