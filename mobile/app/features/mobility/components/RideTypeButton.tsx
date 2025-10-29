import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";
import { RideType } from "@/features/mobility/models";


interface RideTypeButtonProps {
  options: {
    value: RideType;
    label: string;
    icon: any;
    duration?: number;
  }[];
  onSelect: (value: RideType) => void;
  selectedValue: RideType;
}

export function RideTypeButton(props: RideTypeButtonProps) {
  const { themed } = useAppTheme();

  return (
      <>
        {props.options.map((option) => {
          const isSelected = props.selectedValue === option.value;
          return (
              <TouchableOpacity
                  key={option.value}
                  style={[
                    themed($button),
                    isSelected && themed($selectedButton)
                  ]}
                  onPress={() => props.onSelect(option.value)}
              >
                <View style={themed($contentContainer)}>
                  <View style={themed($iconContainer)}>
                    <Image
                        source={option.icon}
                        style={$icon}
                    />
                  </View>
                  <View>
                    <Text style={themed($label)}>{option.label}</Text>
                    {option?.duration ? (
                        <Text style={themed($duration)}>
                          Tempo estimado: {(option.duration / 60).toFixed(0)} minutos
                        </Text>
                    ) : null}
                  </View>
                </View>
                <View style={themed($selectionIndicator)}>
                  {isSelected && <View style={themed($selectedIndicator)} />}
                </View>
              </TouchableOpacity>
          );
        })}
      </>
  );
}

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  marginBottom: spacing.sm,
  flexDirection: 'row',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderWidth: 2,
  borderColor: '#d1d5db',
  borderRadius: 8,
});

const $selectedButton: ThemedStyle<ViewStyle> = () => ({
  borderColor: '#4b5563',
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'center',
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: '#f3f4f6',
  padding: spacing.xs,
  borderRadius: 8,
  marginRight: spacing.md,
});

const $icon: ImageStyle = {
  height: 32,
  width: 32,
};

const $label: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
  fontWeight: 'bold',
});

const $duration: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: '#4b5563',
});

const $selectionIndicator: ThemedStyle<ViewStyle> = () => ({
  height: 15,
  width: 15,
  backgroundColor: '#4b5563',
  borderRadius: 7.5,
  alignItems: 'center',
  justifyContent: 'center',
});

const $selectedIndicator: ThemedStyle<ViewStyle> = () => ({
  height: 10,
  width: 10,
  backgroundColor: '#10b981',
  borderRadius: 5,
});