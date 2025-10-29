import { ActivityIndicator, Platform, Text, View, ViewStyle, TextStyle } from "react-native"
import React, { Fragment } from "react"
import { ScoreDisplay } from "@/components/ScoreDisplay"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Screen } from "@/components/Screen"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useGetLeaderboard } from "@/services/api/queries"
import { LeaderboardItemForLeaderboardResponse } from "@/services/api/scores"

// Dummy type for LeaderboardItem
interface LeaderboardItem {
  id: string
  rank: number
  name: string
  score: number
  metadata?: [string, string][]
}

interface LeaderboardScreenProps extends AppStackScreenProps<"Leaderboard"> {}
export default function Leaderboard(_props: LeaderboardScreenProps) {
  const { themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { data, isLoading, isError } = useGetLeaderboard()

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
          {!data?.data?.length ? (
            <Screen style={themed($emptyContainer)}>
              <Text>Não há nada aqui por enquanto.</Text>
            </Screen>
          ) : (
            <Screen
              contentContainerStyle={[
                themed($scrollViewContent),
                {
                  paddingTop: 20,
                  paddingBottom: Platform.select({
                    android: (insets?.bottom ?? 0) + 30,
                    ios: insets?.bottom,
                  }),
                },
              ]}
              style={themed($scrollView)}
            >
              {data?.data?.map((item) => (
                <HistoryItem key={item.rank} item={item} />
              ))}
            </Screen>
          )}
        </Fragment>
      )}
    </>
  )
}

function HistoryItem({ item }: { item: LeaderboardItemForLeaderboardResponse }) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($historyItemContainer)}>
      <View style={themed($historyItemHeader)}>
        <Text style={themed($historyItemTitle)}>
          {item.rank}° - {item.user_name.split(" ").slice(0, 2).join(" ")}
        </Text>
        <ScoreDisplay score={item.score} />
      </View>
      {/* {item?.metadata?.map((metadata: [string, string]) => (
        <View key={item.id + metadata[0]} style={themed($metadataRow)}>
          <Text style={themed($metadataText)}>
            {metadata[0]}: {metadata[1]}
          </Text>
        </View>
      ))} */}
    </View>
  )
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

const $emptyContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
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

const $historyItemHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})

const $historyItemTitle: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  fontWeight: "bold",
})

const $metadataRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 2,
})

const $metadataText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})
