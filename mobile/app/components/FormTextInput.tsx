import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

interface FormTextInputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
  darkMode?: boolean
}

export function FormTextInput<T extends FieldValues>({
  label,
  ...props
}: FormTextInputProps<T>) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name: props.name, control: props.control });

  const { themed, theme } = useAppTheme();

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || hasValue ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, hasValue]);

  const containerStyle = {
    borderColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: error?.message
        ? ["#FC4A4A", "#FC4A4A"]
        : [theme.colors.text + '40', isFocused ? theme.colors.text : theme.colors.text + '40'],
    }),
  };

  return (
    <View style={[themed($container), { opacity: props.editable === false ? 0.5 : 1 }]}>
      <Text style={[themed($topLabel), {
        color: props.darkMode ? theme.colors.textDark : theme.colors.text
      }]}>{label}</Text>
      <Animated.View style={[themed($inputContainer), containerStyle]}>
        <TextInput
          style={themed($input)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          value={value}
          onChangeText={(text) => {
            setHasValue(text.length > 0);
            onChange(text);
          }}
          placeholderTextColor={theme.colors.text + '60'}
          {...props}
        />
      </Animated.View>

      {error?.message && (
        <View style={themed($errorContainer)}>
          <FontAwesome name="exclamation-circle" size={12} color="#FC4A4A" />
          <Text style={themed($errorText)}>{error.message}</Text>
        </View>
      )}
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
});

const $topLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.text,
  marginBottom: spacing.xs,
  fontWeight: "500",
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderWidth: 1,
  borderRadius: 6,
  backgroundColor: colors.background,
  height: 36,
});

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  fontSize: 14,
  color: colors.text,
  paddingHorizontal: spacing.sm,
  height: '100%',
  backgroundColor: 'transparent',
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  flexDirection: "row",
  alignItems: "center",
});

const $errorText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 12,
  color: "#FC4A4A",
  marginLeft: spacing.xs,
});
