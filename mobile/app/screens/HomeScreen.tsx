import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"

import { Screen } from "@/components/Screen"
import { useAuth } from "@/context/AuthContext"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { api } from "@/services/api"
import {
  Account,
  Category,
  CategoryPacing,
  ControllableCategoryPacing,
  PlannedEntryWithStatus,
  SavingsGoalProgress,
  Transaction,
} from "@/services/api/celeiro"
import { spacing } from "@/theme/spacing"

interface HomeScreenProps extends AppStackScreenProps<"Home"> {}

interface DashboardData {
  categories: Category[]
  pacing?: ControllableCategoryPacing
  plannedEntries: PlannedEntryWithStatus[]
  monthTransactions: Transaction[]
  transactions: Transaction[]
  goals: SavingsGoalProgress[]
}

interface PlannedCategorySummary {
  total: number
  paid: number
  unpaid: number
  late: number
  amount: number
}

interface RhythmCategory {
  category_id: number
  category_name: string
  category_icon: string
  is_controllable: boolean
  budget: number
  spent: number
  expected: number
  variance: number
  status: CategoryPacing["status"] | "no_budget"
}

type HomeTab = "summary" | "detail" | "goals"

const tabs: Array<{ key: HomeTab; label: string }> = [
  { key: "summary", label: "Resumo" },
  { key: "detail", label: "Detalhar" },
  { key: "goals", label: "Metas" },
]

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const today = new Date()

export default function HomeScreen(_props: HomeScreenProps) {
  const { activeOrganization } = useAuth()
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [data, setData] = useState<DashboardData>({
    categories: [],
    plannedEntries: [],
    monthTransactions: [],
    transactions: [],
    goals: [],
  })
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [savingTransactionID, setSavingTransactionID] = useState<number | null>(null)
  const [selectedTab, setSelectedTab] = useState<HomeTab>("summary")
  const [pageWidth, setPageWidth] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const pagerRef = useRef<ScrollView>(null)
  const pulse = useRef(new Animated.Value(0)).current

  const month = selectedDate.getMonth() + 1
  const year = selectedDate.getFullYear()
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()
  const detailCount = data.transactions.length

  const loadDashboard = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [categoriesRes, pacingRes, plannedEntriesRes, accountsRes, goalsRes] = await Promise.all([
          api.getCategories(),
          api.getCategoryPacing(month, year),
          api.getPlannedEntriesForMonth(month, year),
          api.getFinancialAccounts(),
          api.getSavingsGoals(),
        ])

        const accounts = (accountsRes.data ?? []).filter((account) => accountID(account) > 0)
        const transactionResponses = await Promise.all(
          accounts.map((account) => api.getTransactions(accountID(account))),
        )
        const allTransactions = transactionResponses.flatMap((response) => response.data ?? [])
        const monthTransactions = allTransactions
          .filter((transaction) => isSelectedMonth(transaction, month, year))
          .filter((transaction) => !transaction.is_ignored)
        const uncategorizedForMonth = allTransactions
          .filter((transaction) => isSelectedMonth(transaction, month, year))
          .filter((transaction) => !transaction.is_ignored && transaction.category_id == null)
          .sort((a, b) => dateValue(b.transaction_date) - dateValue(a.transaction_date))

        const goalProgress = await Promise.all(
          (goalsRes.data ?? [])
            .filter((goal) => goal.is_active)
            .map((goal) => api.getSavingsGoalProgress(goal.savings_goal_id)),
        )

        const goals = goalProgress
          .map((response) => response.data)
          .filter((progress): progress is SavingsGoalProgress => Boolean(progress))
          .sort((a, b) => moneyValue(b.goal.target_amount) - moneyValue(a.goal.target_amount))

        setData({
          categories: categoriesRes.data ?? [],
          pacing: pacingRes.data,
          plannedEntries: plannedEntriesRes.data ?? [],
          monthTransactions,
          transactions: uncategorizedForMonth,
          goals,
        })
        setDrafts(
          Object.fromEntries(
            uncategorizedForMonth.map((transaction) => [
              transaction.transaction_id,
              transaction.description,
            ]),
          ),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não consegui carregar os dados.")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [month, year],
  )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (detailCount <= 0) {
      pulse.stopAnimation()
      pulse.setValue(0)
      return
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [detailCount, pulse])

  const goalStats = useMemo(() => summarizeGoals(data.goals, month, year), [data.goals, month, year])
  const plannedByCategory = useMemo(
    () => summarizePlannedByCategory(data.plannedEntries),
    [data.plannedEntries],
  )
  const rhythmCategories = useMemo(
    () =>
      buildRhythmCategories(
        data.categories,
        data.pacing?.categories ?? [],
        data.plannedEntries,
        data.monthTransactions,
      ),
    [data.categories, data.pacing?.categories, data.plannedEntries, data.monthTransactions],
  )

  const changeMonth = (amount: number) => {
    setSelectedDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const goToCurrentMonth = () => {
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const selectTab = (tab: HomeTab) => {
    setSelectedTab(tab)
    const index = tabs.findIndex((item) => item.key === tab)
    if (pageWidth > 0) {
      pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true })
    }
  }

  const onPagerLayout = (event: LayoutChangeEvent) => {
    setPageWidth(event.nativeEvent.layout.width)
  }

  const onPagerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
    setSelectedTab(tabs[Math.max(0, Math.min(tabs.length - 1, index))].key)
  }

  const saveTransaction = async (transaction: Transaction) => {
    const nextDescription = (drafts[transaction.transaction_id] ?? "").trim()
    if (!nextDescription) {
      Alert.alert("Nome vazio", "Escreva um nome para salvar essa transação.")
      return
    }
    if (nextDescription === transaction.description) return

    setSavingTransactionID(transaction.transaction_id)
    try {
      const response = await api.updateTransaction(transaction.account_id, transaction.transaction_id, {
        description: nextDescription,
      })
      if (response.status !== 200) throw new Error(response.message)
      await loadDashboard(true)
    } catch (err) {
      Alert.alert("Não consegui salvar", err instanceof Error ? err.message : "Tente de novo.")
    } finally {
      setSavingTransactionID(null)
    }
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      backgroundColor={colors.background}
      contentContainerStyle={$fixedContent}
    >
      <View style={$topBar}>
        <View>
          <Text style={$eyebrow}>{activeOrganization?.name ?? "Casa"}</Text>
          <Text style={$title}>Celeiro</Text>
        </View>
        <TouchableOpacity onPress={() => _props.navigation.navigate("Profile")} style={$profile}>
          <Text style={$profileText}>Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={$monthBand}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={$monthButton}>
          <Text style={$monthButtonText}>{"<"}</Text>
        </TouchableOpacity>
        <View style={$monthCenter}>
          <Text style={$monthTitle}>
            {monthNames[selectedDate.getMonth()]} {year}
          </Text>
          <Text style={[$monthSubTitle, isCurrentMonth ? $currentMonthText : null]}>
            {isCurrentMonth ? "Mês atual" : "Mês selecionado"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={$monthButton}>
          <Text style={$monthButtonText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={$loading}>
          <ActivityIndicator color={colors.ink} />
          <Text style={$muted}>Carregando seu mês...</Text>
        </View>
      ) : error ? (
        <StateBlock title="Não carregou" body={error} action="Tentar de novo" onPress={() => void loadDashboard()} />
      ) : (
        <View style={$body}>
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onLayout={onPagerLayout}
            onMomentumScrollEnd={onPagerScrollEnd}
            style={$pager}
          >
            <Page width={pageWidth}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard(true)} />
                }
                contentContainerStyle={$pageContent}
              >
                {!isCurrentMonth ? (
                  <TouchableOpacity onPress={goToCurrentMonth} style={$currentMonthButton}>
                    <Text style={$currentMonthButtonText}>Voltar para o mês atual</Text>
                  </TouchableOpacity>
                ) : null}
                <SectionTitle
                  title="Ritmos"
                  detail={`${rhythmCategories.length} categorias`}
                />
                {rhythmCategories.length ? (
                  rhythmCategories.map((category) => (
                    <PacingRow
                      key={category.category_id}
                      category={category}
                      planned={plannedByCategory[category.category_id]}
                    />
                  ))
                ) : (
                  <EmptyText text="Nenhum ritmo controlável para este mês." />
                )}
              </ScrollView>
            </Page>

            <Page width={pageWidth}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard(true)} />
                }
                contentContainerStyle={$pageContent}
              >
                <SectionTitle title="Detalhar" detail={`${detailCount} pendentes`} />
                {data.transactions.length ? (
                  data.transactions.slice(0, 24).map((transaction) => (
                    <TransactionDetailRow
                      key={transaction.transaction_id}
                      transaction={transaction}
                      draft={drafts[transaction.transaction_id] ?? transaction.description}
                      isSaving={savingTransactionID === transaction.transaction_id}
                      onChange={(value) =>
                        setDrafts((current) => ({
                          ...current,
                          [transaction.transaction_id]: value,
                        }))
                      }
                      onSave={() => void saveTransaction(transaction)}
                    />
                  ))
                ) : (
                  <EmptyText text="Tudo nomeado ou categorizado neste mês." />
                )}
              </ScrollView>
            </Page>

            <Page width={pageWidth}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard(true)} />
                }
                contentContainerStyle={$pageContent}
              >
                <SectionTitle title="Metas" detail={`${goalStats.savedThisMonth}/${goalStats.total} guardadas`} />
                {data.goals.length ? (
                  data.goals.map((goal) => (
                    <GoalRow key={goal.goal.savings_goal_id} progress={goal} month={month} year={year} />
                  ))
                ) : (
                  <EmptyText text="Nenhuma meta ativa por enquanto." />
                )}
              </ScrollView>
            </Page>
          </ScrollView>
          <BottomTabs
            selectedTab={selectedTab}
            detailCount={detailCount}
            pulse={pulse}
            onSelect={selectTab}
          />
        </View>
      )}
    </Screen>
  )
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={$sectionHeader}>
      <Text style={$sectionTitle}>{title}</Text>
      <Text style={$sectionDetail}>{detail}</Text>
    </View>
  )
}

function Page({ width, children }: { width: number; children: React.ReactNode }) {
  return <View style={[$page, width > 0 ? { width } : null]}>{children}</View>
}

function PulsingDot({ pulse }: { pulse: Animated.Value }) {
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] })
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
  return (
    <View style={$dotWrap}>
      <Animated.View style={[$dotHalo, { opacity, transform: [{ scale }] }]} />
      <View style={$dotCore} />
    </View>
  )
}

function PacingRow({
  category,
  planned,
}: {
  category: RhythmCategory
  planned?: PlannedCategorySummary
}) {
  const variance = category.variance
  const color = category.status === "over_pace" ? colors.red : colors.green
  const amountLabel = category.is_controllable ? rhythmAmountLabel(variance) : money(category.spent)
  return (
    <View style={$row}>
      <View style={$rowText}>
        <Text style={$rowTitle}>
          {category.category_icon ? `${category.category_icon} ` : ""}
          {category.category_name}
        </Text>
        <Text style={$rowSubtitle}>
          {category.is_controllable
            ? `Gasto ${money(category.spent)} de ${money(category.budget)}`
            : `Gasto ${money(category.spent)}`}
        </Text>
        {category.is_controllable ? (
          <BudgetProgressBar
            spent={category.spent}
            budget={category.budget}
            expected={category.expected}
            color={color}
          />
        ) : null}
        {planned && planned.total > 0 ? <PlannedBoxes planned={planned} /> : null}
      </View>
      <Text
        style={[
          ($rowAmount as object),
          { color: category.is_controllable && variance > 0 ? colors.red : colors.ink },
        ]}
      >
        {amountLabel}
      </Text>
    </View>
  )
}

function PlannedBoxes({ planned }: { planned: PlannedCategorySummary }) {
  const visibleCount = Math.min(planned.total, 6)
  const hiddenCount = Math.max(0, planned.total - visibleCount)
  const boxes = Array.from({ length: visibleCount }, (_, index) => {
    if (index < planned.paid) return "paid"
    if (index < planned.paid + planned.late) return "late"
    return "open"
  })
  const status =
    planned.late > 0
      ? `${planned.late} atrasado${planned.late > 1 ? "s" : ""}`
      : `${planned.paid}/${planned.total} pagos`

  return (
    <View style={$plannedRow}>
      <Text style={$plannedLabel}>Planejado</Text>
      <View style={$plannedBoxes}>
        {boxes.map((box, index) => (
          <View
            key={`${box}-${index}`}
            style={[
              $plannedBox,
              box === "paid" ? $plannedBoxPaid : null,
              box === "late" ? $plannedBoxLate : null,
              box === "open" ? $plannedBoxOpen : null,
            ]}
          />
        ))}
        {hiddenCount > 0 ? <Text style={$plannedMore}>+{hiddenCount}</Text> : null}
      </View>
      <Text style={[($plannedStatus as object), { color: planned.late > 0 ? colors.red : colors.muted }]}>
        {status}
      </Text>
    </View>
  )
}

function TransactionDetailRow({
  transaction,
  draft,
  isSaving,
  onChange,
  onSave,
}: {
  transaction: Transaction
  draft: string
  isSaving: boolean
  onChange: (value: string) => void
  onSave: () => void
}) {
  const hasChanged = draft.trim() !== transaction.description
  return (
    <View style={$renameItem}>
      <View style={$transactionMetaRow}>
        <Text style={$transactionAmount}>{money(transaction.amount)}</Text>
        <Text style={$transactionDate}>{shortDate(transaction.transaction_date)}</Text>
      </View>
      <TextInput
        value={draft}
        onChangeText={onChange}
        placeholder="O que foi isso?"
        style={$input}
        returnKeyType="done"
        onSubmitEditing={hasChanged ? onSave : undefined}
      />
      {transaction.original_description ? (
        <Text style={$originalDescription} numberOfLines={1}>
          {transaction.original_description}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={onSave}
        style={[$saveButton, (!hasChanged || isSaving) ? $disabledButton : null]}
        disabled={!hasChanged || isSaving}
      >
        <Text style={$saveButtonText}>{isSaving ? "Salvando..." : "Salvar"}</Text>
      </TouchableOpacity>
    </View>
  )
}

function BottomTabs({
  selectedTab,
  detailCount,
  pulse,
  onSelect,
}: {
  selectedTab: HomeTab
  detailCount: number
  pulse: Animated.Value
  onSelect: (tab: HomeTab) => void
}) {
  return (
    <View style={$bottomTabs}>
      {tabs.map((tab) => {
        const isSelected = selectedTab === tab.key
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.8}
            onPress={() => onSelect(tab.key)}
            style={[$tabButton, isSelected ? $tabButtonSelected : null]}
          >
            <View style={$tabLabelWrap}>
              <Text style={[$tabText, isSelected ? $tabTextSelected : null]}>{tab.label}</Text>
              {tab.key === "detail" && detailCount > 0 ? <PulsingDot pulse={pulse} /> : null}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function GoalRow({
  progress,
  month,
  year,
}: {
  progress: SavingsGoalProgress
  month: number
  year: number
}) {
  const percent = Math.min(100, Math.max(0, moneyValue(progress.progress_percent)))
  const thisMonth = progress.monthly_contributions?.find(
    (contribution) => contribution.month === month && contribution.year === year,
  )
  const savedThisMonth = moneyValue(thisMonth?.amount) > 0
  return (
    <View style={$goalRow}>
      <View style={$transactionMetaRow}>
        <View style={$goalTitleBlock}>
          <Text style={$rowTitle}>{progress.goal.name}</Text>
          <View style={$goalSavedRow}>
            <Text style={[($goalCheck as object), savedThisMonth ? $goalCheckDone : $goalCheckOpen]}>
              {savedThisMonth ? "✓" : "○"}
            </Text>
            <Text style={$rowSubtitle}>
              {savedThisMonth ? `Guardado este mes: ${money(thisMonth?.amount)}` : "Ainda nao guardado este mes"}
            </Text>
          </View>
        </View>
        <Text style={$goalPercent}>{Math.round(percent)}%</Text>
      </View>
      <ProgressBar progress={percent / 100} color={progress.is_on_track === false ? colors.red : colors.green} />
      <Text style={$rowSubtitle}>
        {money(progress.current_amount)} guardado de {money(progress.goal.target_amount)}
      </Text>
      {progress.monthly_target ? (
        <Text style={$rowSubtitle}>Alvo mensal: {money(progress.monthly_target)}</Text>
      ) : null}
    </View>
  )
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={$progressTrack}>
      <View style={[$progressFill, { width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: color }]} />
    </View>
  )
}

function BudgetProgressBar({
  spent,
  budget,
  expected,
  color,
}: {
  spent: number
  budget: number
  expected?: number
  color: string
}) {
  const spentPercent = Math.min(100, Math.max(0, safeRatio(spent, budget) * 100))
  const expectedPercent =
    expected == null ? undefined : Math.min(100, Math.max(0, safeRatio(expected, budget) * 100))
  return (
    <View style={$budgetProgressTrack}>
      <View style={[$budgetProgressFill, { width: `${spentPercent}%`, backgroundColor: color }]} />
      {expectedPercent != null && expectedPercent > 0 ? (
        <View style={[$budgetExpectedMarker, { left: `${expectedPercent}%` }]} />
      ) : null}
    </View>
  )
}

function StateBlock({
  title,
  body,
  action,
  onPress,
}: {
  title: string
  body: string
  action: string
  onPress: () => void
}) {
  return (
    <View style={$stateBlock}>
      <Text style={$stateTitle}>{title}</Text>
      <Text style={$muted}>{body}</Text>
      <TouchableOpacity onPress={onPress} style={$saveButton}>
        <Text style={$saveButtonText}>{action}</Text>
      </TouchableOpacity>
    </View>
  )
}

function EmptyText({ text }: { text: string }) {
  return <Text style={$emptyText}>{text}</Text>
}

function summarizeGoals(goals: SavingsGoalProgress[], month: number, year: number) {
  return goals.reduce(
    (summary, progress) => {
      const contribution = progress.monthly_contributions?.find(
        (item) => item.month === month && item.year === year,
      )
      const contributionAmount = moneyValue(contribution?.amount)
      return {
        total: summary.total + 1,
        savedThisMonth: summary.savedThisMonth + (contributionAmount > 0 ? 1 : 0),
        savedAmount: summary.savedAmount + contributionAmount,
        currentAmount: summary.currentAmount + moneyValue(progress.current_amount),
      }
    },
    { total: 0, savedThisMonth: 0, savedAmount: 0, currentAmount: 0 },
  )
}

function summarizePlannedByCategory(entries: PlannedEntryWithStatus[]) {
  return entries.reduce<Record<number, PlannedCategorySummary>>((summary, entry) => {
    if (entry.EntryType !== "expense" || !entry.IsActive || entry.Status === "dismissed") {
      return summary
    }

    const current = summary[entry.CategoryID] ?? { total: 0, paid: 0, unpaid: 0, late: 0, amount: 0 }
    const isPaid = entry.Status === "matched"
    const isLate = entry.Status === "pending" || entry.Status === "missed" || entry.StatusColor === "red"
    const amount = moneyValue(entry.AmountMax ?? entry.Amount)

    summary[entry.CategoryID] = {
      total: current.total + 1,
      paid: current.paid + (isPaid ? 1 : 0),
      unpaid: current.unpaid + (!isPaid ? 1 : 0),
      late: current.late + (!isPaid && isLate ? 1 : 0),
      amount: current.amount + amount,
    }
    return summary
  }, {})
}

function buildRhythmCategories(
  categories: Category[],
  pacingCategories: CategoryPacing[],
  plannedEntries: PlannedEntryWithStatus[],
  transactions: Transaction[],
) {
  const categoryMap = new Map(
    categories
      .filter((category) => category.category_type === "expense")
      .map((category) => [category.category_id, category]),
  )
  const pacingMap = new Map(pacingCategories.map((category) => [category.category_id, category]))
  const plannedByCategory = summarizePlannedByCategory(plannedEntries)
  const spentByCategory = transactions.reduce<Record<number, number>>((summary, transaction) => {
    if (transaction.category_id == null) return summary
    summary[transaction.category_id] = (summary[transaction.category_id] ?? 0) + moneyValue(transaction.amount)
    return summary
  }, {})

  const categoryIDs = new Set<number>([
    ...Array.from(categoryMap.keys()),
    ...pacingCategories.map((category) => category.category_id),
    ...Object.keys(plannedByCategory).map(Number),
    ...Object.keys(spentByCategory).map(Number),
  ])

  return Array.from(categoryIDs)
    .map((categoryID): RhythmCategory | null => {
      const category = categoryMap.get(categoryID)
      const pacing = pacingMap.get(categoryID)
      if (!category && !pacing) return null

      return {
        category_id: categoryID,
        category_name: pacing?.category_name ?? category?.name ?? "Categoria",
        category_icon: pacing?.category_icon ?? category?.icon ?? "",
        is_controllable: Boolean(category?.is_controllable ?? pacing),
        budget: moneyValue(pacing?.budget),
        spent: moneyValue(pacing?.spent) || spentByCategory[categoryID] || 0,
        expected: moneyValue(pacing?.expected),
        variance: moneyValue(pacing?.variance),
        status: pacing?.status ?? "no_budget",
      }
    })
    .filter((category): category is RhythmCategory => Boolean(category))
    .filter((category) => {
      const planned = plannedByCategory[category.category_id]
      return category.is_controllable || category.spent > 0 || (planned?.total ?? 0) > 0
    })
    .sort((a, b) => {
      if (a.is_controllable !== b.is_controllable) return a.is_controllable ? -1 : 1
      const plannedA = plannedByCategory[a.category_id]?.amount ?? 0
      const plannedB = plannedByCategory[b.category_id]?.amount ?? 0
      const amountA = Math.max(a.budget, a.spent, plannedA)
      const amountB = Math.max(b.budget, b.spent, plannedB)
      return amountB - amountA
    })
}

function isSelectedMonth(transaction: Transaction, month: number, year: number) {
  const date = new Date(transaction.transaction_date)
  return date.getMonth() + 1 === month && date.getFullYear() === year
}

function accountID(account: Account) {
  return account.account_id ?? account.AccountID ?? 0
}

function money(value: string | number | null | undefined) {
  const numeric = typeof value === "number" ? value : moneyValue(value)
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric)
}

function moneyValue(value: string | number | null | undefined) {
  if (typeof value === "number") return value
  if (!value) return 0
  return Number(String(value).replace(",", ".")) || 0
}

function rhythmAmountLabel(variance: number) {
  const absolute = Math.abs(variance)
  if (absolute < 1) return "no ritmo"
  return `${money(absolute)} ${variance > 0 ? "acima" : "abaixo"}`
}

function safeRatio(value: number, total: number) {
  if (total <= 0) return 0
  return value / total
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(value),
  )
}

function dateValue(value: string) {
  return new Date(value).getTime()
}

const colors = {
  background: "#F7F8F4",
  surface: "#FFFFFF",
  ink: "#17211B",
  muted: "#647067",
  border: "#DCE2DA",
  soft: "#EEF3EA",
  green: "#287A4B",
  blue: "#2F6F9F",
  red: "#B13F36",
  amber: "#946A21",
}

const $fixedContent: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
}

const $body: ViewStyle = {
  flex: 1,
  marginTop: spacing.sm,
}

const $pager: ViewStyle = {
  flex: 1,
}

const $page: ViewStyle = {
  flex: 1,
}

const $pageContent: ViewStyle = {
  paddingBottom: spacing.lg,
}

const $topBar: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.xs,
}

const $eyebrow = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: "700" as const,
}

const $title = {
  color: colors.ink,
  fontSize: 22,
  fontWeight: "800" as const,
}

const $profile: ViewStyle = {
  backgroundColor: colors.soft,
  borderRadius: 8,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
}

const $profileText = {
  color: colors.ink,
  fontWeight: "700" as const,
}

const $monthBand: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: 4,
  paddingVertical: 4,
}

const $monthButton: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.soft,
  borderRadius: 7,
  height: 30,
  justifyContent: "center",
  width: 30,
}

const $monthButtonText = {
  color: colors.ink,
  fontSize: 16,
  fontWeight: "800" as const,
}

const $monthCenter: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $monthTitle = {
  color: colors.ink,
  fontSize: 15,
  fontWeight: "800" as const,
}

const $monthSubTitle = {
  color: colors.muted,
  fontSize: 10,
  fontWeight: "700" as const,
}

const $currentMonthText = {
  color: "#A7E0BD",
}

const $currentMonthButton: ViewStyle = {
  alignItems: "center",
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: spacing.xs,
  paddingVertical: spacing.sm,
}

const $currentMonthButtonText = {
  color: colors.ink,
  fontWeight: "800" as const,
}

const $loading: ViewStyle = {
  alignItems: "center",
  flex: 1,
  gap: spacing.sm,
  justifyContent: "center",
  paddingVertical: spacing.xxl,
}

const $sectionHeader: ViewStyle = {
  alignItems: "flex-end",
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
}

const $sectionTitle = {
  color: colors.ink,
  fontSize: 19,
  fontWeight: "800" as const,
}

const $sectionDetail = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: "700" as const,
}

const $budgetProgressTrack: ViewStyle = {
  backgroundColor: colors.soft,
  borderRadius: 999,
  height: 4,
  marginTop: spacing.sm,
  overflow: "hidden",
  position: "relative",
  width: "100%",
}

const $budgetProgressFill: ViewStyle = {
  borderRadius: 999,
  height: "100%",
}

const $budgetExpectedMarker: ViewStyle = {
  backgroundColor: colors.ink,
  height: 8,
  marginLeft: -1,
  opacity: 0.5,
  position: "absolute",
  top: -2,
  width: 2,
}

const $dotWrap: ViewStyle = {
  alignItems: "center",
  height: 22,
  justifyContent: "center",
  width: 22,
}

const $dotHalo: ViewStyle = {
  backgroundColor: colors.red,
  borderRadius: 999,
  height: 14,
  position: "absolute",
  width: 14,
}

const $dotCore: ViewStyle = {
  backgroundColor: colors.red,
  borderColor: colors.surface,
  borderRadius: 999,
  borderWidth: 2,
  height: 12,
  width: 12,
}

const $row: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.surface,
  borderBottomColor: colors.border,
  borderBottomWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.sm,
}

const $rowText: ViewStyle = {
  flex: 1,
  paddingRight: spacing.sm,
}

const $rowTitle = {
  color: colors.ink,
  fontSize: 15,
  fontWeight: "800" as const,
}

const $rowSubtitle = {
  color: colors.muted,
  fontSize: 13,
  marginTop: spacing.xxs,
}

const $rowAmount = {
  color: colors.ink,
  fontSize: 13,
  fontWeight: "800" as const,
  maxWidth: 92,
  textAlign: "right" as const,
}

const $plannedRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xxs,
  marginTop: spacing.xs,
}

const $plannedLabel = {
  color: colors.muted,
  fontSize: 11,
  fontWeight: "900" as const,
  marginRight: spacing.xxs,
}

const $plannedBoxes: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  gap: 3,
}

const $plannedBox: ViewStyle = {
  borderRadius: 3,
  borderWidth: 1,
  height: 12,
  width: 12,
}

const $plannedBoxPaid: ViewStyle = {
  backgroundColor: colors.green,
  borderColor: colors.green,
}

const $plannedBoxLate: ViewStyle = {
  backgroundColor: colors.red,
  borderColor: colors.red,
}

const $plannedBoxOpen: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
}

const $plannedMore = {
  color: colors.muted,
  fontSize: 11,
  fontWeight: "800" as const,
  marginLeft: 2,
}

const $plannedStatus = {
  fontSize: 11,
  fontWeight: "800" as const,
  marginLeft: spacing.xxs,
}

const $progressTrack: ViewStyle = {
  backgroundColor: colors.soft,
  borderRadius: 999,
  height: 8,
  marginTop: spacing.xs,
  overflow: "hidden",
  width: "100%",
}

const $progressFill: ViewStyle = {
  borderRadius: 999,
  height: "100%",
}

const $renameItem: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: spacing.sm,
  padding: spacing.sm,
}

const $transactionMetaRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
}

const $transactionAmount = {
  color: colors.ink,
  fontSize: 16,
  fontWeight: "900" as const,
}

const $transactionDate = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: "700" as const,
}

const $input = {
  backgroundColor: colors.soft,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  color: colors.ink,
  fontSize: 16,
  fontWeight: "700" as const,
  marginTop: spacing.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
}

const $originalDescription = {
  color: colors.muted,
  fontSize: 12,
  marginTop: spacing.xs,
}

const $saveButton: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.ink,
  borderRadius: 8,
  marginTop: spacing.sm,
  paddingVertical: spacing.sm,
}

const $disabledButton: ViewStyle = {
  opacity: 0.6,
}

const $saveButtonText = {
  color: "#FFFFFF",
  fontWeight: "800" as const,
}

const $goalRow: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: spacing.sm,
  padding: spacing.sm,
}

const $goalTitleBlock: ViewStyle = {
  flex: 1,
  paddingRight: spacing.sm,
}

const $goalSavedRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
}

const $goalCheck = {
  fontSize: 14,
  fontWeight: "900" as const,
  marginRight: spacing.xs,
  marginTop: spacing.xxs,
}

const $goalCheckDone = {
  color: colors.green,
}

const $goalCheckOpen = {
  color: colors.muted,
}

const $goalPercent = {
  color: colors.green,
  fontSize: 16,
  fontWeight: "900" as const,
}

const $emptyText = {
  color: colors.muted,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  padding: spacing.md,
}

const $stateBlock: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  marginTop: spacing.lg,
  padding: spacing.md,
}

const $stateTitle = {
  color: colors.ink,
  fontSize: 18,
  fontWeight: "800" as const,
  marginBottom: spacing.xs,
}

const $muted = {
  color: colors.muted,
}

const $bottomTabs: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.xs,
  marginTop: spacing.sm,
  padding: 4,
}

const $tabButton: ViewStyle = {
  alignItems: "center",
  borderRadius: 7,
  flex: 1,
  justifyContent: "center",
  minHeight: 42,
}

const $tabButtonSelected: ViewStyle = {
  backgroundColor: colors.ink,
}

const $tabLabelWrap: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.xxs,
}

const $tabText = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: "900" as const,
}

const $tabTextSelected = {
  color: "#FFFFFF",
}
