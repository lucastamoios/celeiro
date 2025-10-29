import React from 'react';
import { View, Text, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Image } from "expo-image";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

export function ScoreDisplay(props: { score: number, invalid?: boolean }) {
    const { themed } = useAppTheme();

    return (
        <View style={[
            themed($container), 
            { backgroundColor: props.invalid ? '#9c2525' : '#1C2A16' }
        ]}>
            <Text style={themed($scoreText)}>
                {props.score}
            </Text>
            <Image
                style={$icon}
                source={require("../assets/images/points-icon.svg")}
            />
        </View>
    );
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    backgroundColor: '#1C2A16',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    padding: spacing.xs,
});

const $scoreText: ThemedStyle<TextStyle> = ({ spacing }) => ({
    color: 'white',
    fontWeight: '800',
    marginRight: spacing.xs,
});

const $icon: ImageStyle = {
    height: 16,
    width: 12,
};