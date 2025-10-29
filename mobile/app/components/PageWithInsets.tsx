import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

export function PageWithInsets(props: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { themed } = useAppTheme();

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => (
        <View
          style={[
            themed($container),
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
            props.style,
          ]}
        >
          {props.children}
        </View>
      )}
    </SafeAreaInsetsContext.Consumer>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});
