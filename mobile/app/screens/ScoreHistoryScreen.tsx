import React, { Fragment } from "react";
import { DefaultHeaderTitle } from "@/components/DefaultHeaderTitle";
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { Screen } from "@/components/Screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";
import { AppStackScreenProps } from "@/navigators/AppNavigator";
import { useGetMyScoreHistory } from "@/services/api/queries";
import { ScoreHistoryItemForResponse } from "@/services/api/scores";

interface ScoreHistoryScreenProps extends AppStackScreenProps<"ScoreHistory"> {}
export default function ScoreHistory(_props: ScoreHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const { themed } = useAppTheme();
  
  const { data, isLoading, isError } = useGetMyScoreHistory()

  return (
    <>
      {isLoading ? (
        <Screen style={themed($loadingContainer)}>
          <ActivityIndicator />
        </Screen>
      ) : isError ? (
        <Screen style={themed($errorContainer)}>
          <Text style={themed($errorText)}>
            Você está desconectado. Tente novamente mais tarde.
          </Text>
        </Screen>
      ) : (
        <Fragment>
          <View style={themed($headerContainer)}>
            <View style={themed($scoreRow)}>
              <Text style={themed($scoreLabel)}>Pontuação total</Text>
              <Text style={themed($scoreValue)}>{data?.data?.total_score}</Text>
            </View>
            <View style={themed($scoreRow)}>
              <Text style={themed($scoreLabel)}>Pontuação este mês</Text>
              <Text style={themed($scoreValue)}>{data?.data?.total_score_in_month ?? 0}</Text>
            </View>
            <View style={themed($divider)} />
          </View>

          <Screen
            contentContainerStyle={[
              themed($scrollViewContent),
              {
                paddingBottom: Platform.select({
                  android: (insets?.bottom ?? 0) + 30,
                  ios: insets?.bottom,
                }),
              },
            ]}
            style={themed($scrollView)}
          >
            {data?.data?.items.map((item) => <HistoryItem key={item.date.toString()} item={item} />)}
          </Screen>
        </Fragment>
      )}
    </>
  );
}

function HistoryItem({ item }: { item: ScoreHistoryItemForResponse }) {
  const { themed } = useAppTheme();
  
  return (
    <View style={themed($historyItemContainer)}>
      <View style={themed($historyItemHeader)}>
        <Text style={themed($historyItemTitle)}>{item.title}</Text>
        <ScoreDisplay score={item.score} invalid={!item.is_valid} />
      </View>
      <View style={themed($metadataRow)}>
        <Text style={themed($metadataText)}>
          Realizado em: {new Date(item.date).toLocaleString("pt-br")}
        </Text>
      </View>
      {item.score_metadata.split("\n").map((metadata: string) => (
        <View key={metadata} style={themed($metadataRow)}>
          <Text style={themed($metadataText)}>
            {metadata}
          </Text>
        </View>
      ))}
    </View>
  );
}

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
})

const $errorText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "bold",
  fontSize: 18,
  textAlign: "center",
})

const $headerContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  backgroundColor: colors.background,
})

const $scoreRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: spacing.xs,
})

const $scoreLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  fontWeight: "bold",
})

const $scoreValue: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 2,
  borderColor: colors.backgroundSecondary,
  marginVertical: spacing.sm,
})

const $scrollViewContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
})

const $scrollView: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
})

const $historyItemContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundSecondary,
  padding: spacing.sm,
  borderRadius: 4,
  marginBottom: spacing.xs,
})

const $historyItemHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
})

const $historyItemTitle: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  fontWeight: "bold",
})

const $metadataRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xxs,
})

const $metadataText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})
