import React, { useState } from "react";
import {
  Text,
  View,
  Platform,
  Modal,
  TouchableOpacity,
  Pressable,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome } from "@expo/vector-icons";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

interface FormPickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: Array<{ label: string; value: string | number }>;
  editable?: boolean;
}

export function FormPicker<T extends FieldValues>({
  label,
  options,
  ...props
}: FormPickerProps<T>) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name: props.name, control: props.control });

  const { themed, theme } = useAppTheme();
  const selectedOption = options.find(option => option.value === value);

  const renderIOSPicker = () => (
    <Modal
      visible={showIOSPicker}
      transparent={true}
      animationType="slide"
    >
      <View style={themed($modalContainer)}>
        <View style={themed($pickerHeader)}>
          <Text style={themed($pickerHeaderText)}>{label}</Text>
          <TouchableOpacity
            onPress={() => setShowIOSPicker(false)}
            style={themed($doneButton)}
          >
            <Text style={themed($doneButtonText)}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={themed($pickerContainer)}>
          <Picker
            selectedValue={value}
            onValueChange={onChange}
          >
            {options.map((option) => (
              <Picker.Item
                key={option.value.toString()}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );

  const renderAndroidPicker = () => (
    <Picker
      selectedValue={value}
      onValueChange={onChange}
      style={themed($androidPicker)}
      dropdownIconColor={theme.colors.text}
    >
      {options.map((option) => (
        <Picker.Item
          key={option.value.toString()}
          label={option.label}
          value={option.value}
          color={theme.colors.text}
        />
      ))}
    </Picker>
  );

  return (
    <View style={[themed($container), { opacity: props.editable === false ? 0.5 : 1 }]}>
      <Text style={themed($label)}>{label}</Text>
      <View style={[themed($inputContainer), error?.message && themed($inputContainerError)]}>
        {Platform.OS === 'ios' ? (
          <Pressable
            onPress={() => setShowIOSPicker(true)}
            style={themed($iosPickerButton)}
          >
            <Text style={themed($selectedValueText)}>
              {selectedOption?.label || 'Select an option'}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={theme.colors.text} />
          </Pressable>
        ) : (
          renderAndroidPicker()
        )}
      </View>

      {error?.message && (
        <View style={themed($errorContainer)}>
          <FontAwesome name="exclamation-circle" size={12} color="#FC4A4A" />
          <Text style={themed($errorText)}>{error.message}</Text>
        </View>
      )}

      {Platform.OS === 'ios' && renderIOSPicker()}
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
});

const $label: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.text,
  marginBottom: spacing.xs,
  fontWeight: "500",
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderWidth: 1,
  borderColor: colors.text + '40',
  borderRadius: 6,
  backgroundColor: colors.background,
});

const $inputContainerError: ThemedStyle<ViewStyle> = () => ({
  borderColor: "#FC4A4A",
});

const $androidPicker: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 36,
  color: colors.text,
  marginTop: 0,
});

const $iosPickerButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: 36,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.sm,
});

const $selectedValueText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $modalContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
});

const $pickerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  paddingBottom: Platform.OS === 'ios' ? 20 : 0,
});

const $pickerHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  padding: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.text + '20',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center'
});

const $pickerHeaderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 16,
  fontWeight: '500',
});

const $doneButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $doneButtonText: ThemedStyle<TextStyle> = () => ({
  color: '#007AFF',
  fontSize: 16,
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
