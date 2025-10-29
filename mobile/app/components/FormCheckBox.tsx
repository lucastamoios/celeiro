import React from "react";
import {
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

interface FormCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function FormCheckbox<T extends FieldValues>({
  label,
  style,
  ...props
}: FormCheckboxProps<T>) {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name: props.name, control: props.control });

  const { themed } = useAppTheme();

  return (
    <View style={[themed($container), style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChange(!value)}
        style={themed($touchable)}
      >
        <View
          style={[
            themed($checkboxContainer),
            {
              borderColor: error?.message ? "#FC4A4A" : "#222222",
              backgroundColor: value ? "#B3B3B3" : "#181818",
            },
          ]}
        >
          {value && (
            <FontAwesome name="check" size={16} color="#181818" />
          )}
        </View>
        <Text
          style={[
            themed($label),
            {
              color: value ? "#EDEDED" : "#B3B3B3",
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
      {error?.message && (
        <View style={themed($errorContainer)}>
          <FontAwesome name="warning" size={24} color="#FC4A4A" />
          <Text style={themed($errorText)}>{error?.message}</Text>
        </View>
      )}
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
});

const $touchable: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $checkboxContainer: ThemedStyle<ViewStyle> = () => ({
  width: 24,
  height: 24,
  borderWidth: 2,
  borderRadius: 4,
  justifyContent: "center",
  alignItems: "center",
});

const $label: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 16,
  fontWeight: "bold",
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  flexDirection: "row",
  alignItems: "center",
});

const $errorText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  color: "#FC4A4A",
  marginLeft: spacing.xs,
});
