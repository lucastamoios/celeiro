package financial

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/catrutech/celeiro/internal/application"
	financialApp "github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"

	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
)

type Handler struct {
	app *application.Application
}

func NewHandler(app *application.Application) *Handler {
	return &Handler{app: app}
}

// Helper to get user ID and org ID from context
func (h *Handler) getSessionInfo(r *http.Request) (userID, organizationID int, err error) {
	session, err := h.app.AccountsService.GetSessionFromContext(r.Context())
	if err != nil {
		return 0, 0, err
	}

	// Get active organization from context (set by middleware)
	orgID, err := h.app.AccountsService.GetActiveOrganizationFromContext(r.Context())
	if err != nil {
		return 0, 0, err
	}

	return session.Info.User.ID, orgID, nil
}

// ============================================================================
// Categories
// ============================================================================

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	categories, err := h.app.FinancialService.GetCategories(r.Context(), financialApp.GetCategoriesInput{
		UserID:        userID,
		IncludeSystem: true,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(categories, w)
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		Name  string `json:"name"`
		Icon  string `json:"icon"`
		Color string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Default color if not provided
	color := req.Color
	if color == "" {
		color = "#6B7280"
	}

	category, err := h.app.FinancialService.CreateCategory(r.Context(), financialApp.CreateCategoryInput{
		Name:   req.Name,
		Icon:   req.Icon,
		Color:  color,
		UserID: userID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(category, w)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	categoryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		Name  *string `json:"name,omitempty"`
		Icon  *string `json:"icon,omitempty"`
		Color *string `json:"color,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	category, err := h.app.FinancialService.UpdateCategory(r.Context(), financialApp.UpdateCategoryInput{
		CategoryID: categoryID,
		UserID:     userID,
		Name:       req.Name,
		Icon:       req.Icon,
		Color:      req.Color,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(category, w)
}

// ============================================================================
// Accounts
// ============================================================================

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	accounts, err := h.app.FinancialService.GetAccounts(r.Context(), financialApp.GetAccountsInput{
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(accounts, w)
}

func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		Name        string  `json:"name"`
		AccountType string  `json:"account_type"`
		BankName    string  `json:"bank_name"`
		Balance     float64 `json:"balance"`
		Currency    string  `json:"currency"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	account, err := h.app.FinancialService.CreateAccount(r.Context(), financialApp.CreateAccountInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Name:           req.Name,
		AccountType:    req.AccountType,
		BankName:       req.BankName,
		Balance:        decimal.NewFromFloat(req.Balance),
		Currency:       req.Currency,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(account, w)
}

func (h *Handler) GetAccount(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	accountID, err := strconv.Atoi(chi.URLParam(r, "accountId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	account, err := h.app.FinancialService.GetAccountByID(r.Context(), financialApp.GetAccountByIDInput{
		AccountID:      accountID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(account, w)
}

// ============================================================================
// Transactions
// ============================================================================

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	accountID, err := strconv.Atoi(chi.URLParam(r, "accountId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit == 0 {
		limit = 1000 // Increased default limit to show more transactions
	}

	transactions, err := h.app.FinancialService.GetTransactions(r.Context(), financialApp.GetTransactionsInput{
		AccountID:      accountID,
		UserID:         userID,
		OrganizationID: organizationID,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(transactions, w)
}

func (h *Handler) ListUncategorizedTransactions(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit == 0 {
		limit = 1000
	}

	transactions, err := h.app.FinancialService.GetUncategorizedTransactions(r.Context(), financialApp.GetUncategorizedTransactionsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(transactions, w)
}

func (h *Handler) ImportOFX(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	accountID, err := strconv.Atoi(chi.URLParam(r, "accountId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	file, _, err := r.FormFile("ofx_file")
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}
	defer file.Close()

	// Read file content (must read until EOF; a single Read() can truncate)
	fileBytes, err := io.ReadAll(io.LimitReader(file, 10<<20))
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Import transactions from OFX
	result, err := h.app.FinancialService.ImportTransactionsFromOFX(r.Context(), financialApp.ImportOFXInput{
		AccountID:      accountID,
		UserID:         userID,
		OrganizationID: organizationID,
		OFXData:        fileBytes,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(result, w)
}

func (h *Handler) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	transactionID, err := strconv.Atoi(chi.URLParam(r, "transactionId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		CategoryID  *int               `json:"category_id"`
		Description *string            `json:"description"`
		Amount      *float64           `json:"amount"`
		Notes       *string            `json:"notes"`
		IsIgnored   *bool              `json:"is_ignored"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Convert amount to decimal if provided
	var amountDecimal *decimal.Decimal
	if req.Amount != nil {
		amt := decimal.NewFromFloat(*req.Amount)
		amountDecimal = &amt
	}

	transaction, err := h.app.FinancialService.UpdateTransaction(r.Context(), financialApp.UpdateTransactionInput{
		TransactionID:  transactionID,
		UserID:         userID,
		OrganizationID: organizationID,
		CategoryID:     req.CategoryID,
		Description:    req.Description,
		Amount:         amountDecimal,
		Notes:          req.Notes,
		IsIgnored:      req.IsIgnored,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(transaction, w)
}

// ============================================================================
// Budgets
// ============================================================================

func (h *Handler) ListBudgets(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgets, err := h.app.FinancialService.GetBudgets(r.Context(), financialApp.GetBudgetsInput{
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budgets, w)
}

func (h *Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		Name       string  `json:"name"`
		Month      int     `json:"month"`
		Year       int     `json:"year"`
		BudgetType string  `json:"budget_type"`
		Amount     float64 `json:"amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	budget, err := h.app.FinancialService.CreateBudget(r.Context(), financialApp.CreateBudgetInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Name:           req.Name,
		Month:          req.Month,
		Year:           req.Year,
		BudgetType:     req.BudgetType,
		Amount:         decimal.NewFromFloat(req.Amount),
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budget, w)
}

func (h *Handler) GetBudgetByID(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "budgetId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	budget, err := h.app.FinancialService.GetBudgetByID(r.Context(), financialApp.GetBudgetByIDInput{
		BudgetID:       budgetID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budget, w)
}

func (h *Handler) GetBudgetProgress(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "budgetId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	progress, err := h.app.FinancialService.CalculateBudgetProgress(r.Context(), financialApp.CalculateBudgetProgressInput{
		BudgetID:       budgetID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(progress, w)
}

// ============================================================================
// Budget Items
// ============================================================================

func (h *Handler) CreateBudgetItem(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "budgetId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		CategoryID    int     `json:"category_id"`
		PlannedAmount float64 `json:"planned_amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Validation: planned_amount must be > 0
	if req.PlannedAmount <= 0 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Verify budget ownership (GetBudgetByID checks ownership)
	_, err = h.app.FinancialService.GetBudgetByID(r.Context(), financialApp.GetBudgetByIDInput{
		BudgetID:       budgetID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Verify category exists and user has access
	_, err = h.app.FinancialService.GetCategoryByID(r.Context(), financialApp.GetCategoryByIDInput{
		CategoryID: req.CategoryID,
		UserID:     userID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	budgetItem, err := h.app.FinancialService.CreateBudgetItem(r.Context(), financialApp.CreateBudgetItemInput{
		BudgetID:      budgetID,
		CategoryID:    req.CategoryID,
		PlannedAmount: decimal.NewFromFloat(req.PlannedAmount),
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budgetItem, w)
}

func (h *Handler) UpdateBudgetItem(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetItemID, err := strconv.Atoi(chi.URLParam(r, "itemId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		PlannedAmount *float64 `json:"planned_amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Validation: if planned_amount is provided, it must be > 0
	if req.PlannedAmount != nil && *req.PlannedAmount <= 0 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Convert amount to decimal if provided
	var plannedAmountDecimal *decimal.Decimal
	if req.PlannedAmount != nil {
		amt := decimal.NewFromFloat(*req.PlannedAmount)
		plannedAmountDecimal = &amt
	}

	budgetItem, err := h.app.FinancialService.UpdateBudgetItem(r.Context(), financialApp.UpdateBudgetItemInput{
		BudgetItemID:  budgetItemID,
		UserID:        userID,
		PlannedAmount: plannedAmountDecimal,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budgetItem, w)
}

func (h *Handler) DeleteBudgetItem(w http.ResponseWriter, r *http.Request) {
	userID, _, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetItemID, err := strconv.Atoi(chi.URLParam(r, "itemId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	err = h.app.FinancialService.DeleteBudgetItem(r.Context(), financialApp.DeleteBudgetItemInput{
		BudgetItemID: budgetItemID,
		UserID:       userID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]string{"message": "budget item deleted successfully"}, w)
}

func (h *Handler) GetBudgetSpending(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "budgetId"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	spending, err := h.app.FinancialService.GetBudgetSpending(r.Context(), financialApp.GetBudgetSpendingInput{
		BudgetID:       budgetID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(spending, w)
}

// ============================================================================
// Category Budgets
// ============================================================================

func (h *Handler) ListCategoryBudgets(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse optional query parameters
	var month, year, categoryID *int
	if monthStr := r.URL.Query().Get("month"); monthStr != "" {
		m, err := strconv.Atoi(monthStr)
		if err == nil {
			month = &m
		}
	}
	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		y, err := strconv.Atoi(yearStr)
		if err == nil {
			year = &y
		}
	}
	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		c, err := strconv.Atoi(catStr)
		if err == nil {
			categoryID = &c
		}
	}

	budgets, err := h.app.FinancialService.GetCategoryBudgets(r.Context(), financialApp.GetCategoryBudgetsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
		CategoryID:     categoryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budgets, w)
}

func (h *Handler) GetCategoryBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	budget, err := h.app.FinancialService.GetCategoryBudgetByID(r.Context(), financialApp.GetCategoryBudgetByIDInput{
		CategoryBudgetID: budgetID,
		UserID:           userID,
		OrganizationID:   organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budget, w)
}

func (h *Handler) CreateCategoryBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		CategoryID    int     `json:"category_id"`
		Month         int     `json:"month"`
		Year          int     `json:"year"`
		BudgetType    string  `json:"budget_type"`
		PlannedAmount float64 `json:"planned_amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	budget, err := h.app.FinancialService.CreateCategoryBudget(r.Context(), financialApp.CreateCategoryBudgetInput{
		UserID:         userID,
		OrganizationID: organizationID,
		CategoryID:     req.CategoryID,
		Month:          req.Month,
		Year:           req.Year,
		BudgetType:     req.BudgetType,
		PlannedAmount:  decimal.NewFromFloat(req.PlannedAmount),
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budget, w)
}

func (h *Handler) UpdateCategoryBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		BudgetType    *string  `json:"budget_type,omitempty"`
		PlannedAmount *float64 `json:"planned_amount,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var plannedAmount *decimal.Decimal
	if req.PlannedAmount != nil {
		amt := decimal.NewFromFloat(*req.PlannedAmount)
		plannedAmount = &amt
	}

	budget, err := h.app.FinancialService.UpdateCategoryBudget(r.Context(), financialApp.UpdateCategoryBudgetInput{
		CategoryBudgetID: budgetID,
		UserID:           userID,
		OrganizationID:   organizationID,
		BudgetType:       req.BudgetType,
		PlannedAmount:    plannedAmount,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(budget, w)
}

func (h *Handler) DeleteCategoryBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	err = h.app.FinancialService.DeleteCategoryBudget(r.Context(), financialApp.DeleteCategoryBudgetInput{
		CategoryBudgetID: budgetID,
		UserID:           userID,
		OrganizationID:   organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]string{"message": "category budget deleted successfully"}, w)
}

func (h *Handler) ConsolidateCategoryBudget(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	budgetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	snapshot, err := h.app.FinancialService.ConsolidateCategoryBudget(r.Context(), financialApp.ConsolidateCategoryBudgetInput{
		CategoryBudgetID: budgetID,
		UserID:           userID,
		OrganizationID:   organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(snapshot, w)
}

// ============================================================================
// Planned Entries
// ============================================================================

func (h *Handler) ListPlannedEntries(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse optional query parameters
	var categoryID *int
	var isRecurrent, isActive *bool

	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		c, err := strconv.Atoi(catStr)
		if err == nil {
			categoryID = &c
		}
	}
	if recStr := r.URL.Query().Get("is_recurrent"); recStr != "" {
		b := recStr == "true"
		isRecurrent = &b
	}
	if actStr := r.URL.Query().Get("is_active"); actStr != "" {
		b := actStr == "true"
		isActive = &b
	}

	entries, err := h.app.FinancialService.GetPlannedEntries(r.Context(), financialApp.GetPlannedEntriesInput{
		UserID:         userID,
		OrganizationID: organizationID,
		CategoryID:     categoryID,
		IsRecurrent:    isRecurrent,
		IsActive:       isActive,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(entries, w)
}

func (h *Handler) GetPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	entry, err := h.app.FinancialService.GetPlannedEntryByID(r.Context(), financialApp.GetPlannedEntryByIDInput{
		PlannedEntryID: entryID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(entry, w)
}

func (h *Handler) GetSavedPatterns(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var categoryID *int
	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		c, err := strconv.Atoi(catStr)
		if err == nil {
			categoryID = &c
		}
	}

	patterns, err := h.app.FinancialService.GetSavedPatterns(r.Context(), financialApp.GetSavedPatternsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		CategoryID:     categoryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(patterns, w)
}

func (h *Handler) CreatePlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		CategoryID         int      `json:"category_id"`
		PatternID          *int     `json:"pattern_id,omitempty"`
		Description        string   `json:"description"`
		DescriptionPattern *string  `json:"description_pattern,omitempty"`
		Amount             float64  `json:"amount"`
		AmountMin          *float64 `json:"amount_min,omitempty"`
		AmountMax          *float64 `json:"amount_max,omitempty"`
		ExpectedDayStart   *int     `json:"expected_day_start,omitempty"`
		ExpectedDayEnd     *int     `json:"expected_day_end,omitempty"`
		ExpectedDay        *int     `json:"expected_day,omitempty"`
		EntryType     string `json:"entry_type"`
		IsRecurrent   bool   `json:"is_recurrent"`
		ParentEntryID *int   `json:"parent_entry_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Convert amount range to decimal pointers
	var amountMin, amountMax *decimal.Decimal
	if req.AmountMin != nil {
		amt := decimal.NewFromFloat(*req.AmountMin)
		amountMin = &amt
	}
	if req.AmountMax != nil {
		amt := decimal.NewFromFloat(*req.AmountMax)
		amountMax = &amt
	}

	// If a description pattern is provided, create an Advanced Pattern first
	var patternID *int
	if req.DescriptionPattern != nil && *req.DescriptionPattern != "" {
		pattern, err := h.app.FinancialService.CreateAdvancedPattern(r.Context(), financialApp.CreateAdvancedPatternInput{
			UserID:             userID,
			OrganizationID:     organizationID,
			DescriptionPattern: *req.DescriptionPattern,
			AmountMin:          req.AmountMin,
			AmountMax:          req.AmountMax,
			TargetDescription:  req.Description,
			TargetCategoryID:   req.CategoryID,
			ApplyRetroactively: false,
		})
		if err != nil {
			responses.NewError(w, err)
			return
		}
		patternID = &pattern.PatternID
	} else if req.PatternID != nil {
		patternID = req.PatternID
	}

	entry, err := h.app.FinancialService.CreatePlannedEntry(r.Context(), financialApp.CreatePlannedEntryInput{
		UserID:           userID,
		OrganizationID:   organizationID,
		CategoryID:       req.CategoryID,
		PatternID:        patternID,
		Description:      req.Description,
		Amount:           decimal.NewFromFloat(req.Amount),
		AmountMin:        amountMin,
		AmountMax:        amountMax,
		ExpectedDayStart: req.ExpectedDayStart,
		ExpectedDayEnd:   req.ExpectedDayEnd,
		ExpectedDay:      req.ExpectedDay,
		EntryType:        req.EntryType,
		IsRecurrent:      req.IsRecurrent,
		ParentEntryID:    req.ParentEntryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(entry, w)
}

func (h *Handler) UpdatePlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		Description *string  `json:"description,omitempty"`
		Amount      *float64 `json:"amount,omitempty"`
		ExpectedDay *int     `json:"expected_day,omitempty"`
		IsActive    *bool    `json:"is_active,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var amount *decimal.Decimal
	if req.Amount != nil {
		amt := decimal.NewFromFloat(*req.Amount)
		amount = &amt
	}

	entry, err := h.app.FinancialService.UpdatePlannedEntry(r.Context(), financialApp.UpdatePlannedEntryInput{
		PlannedEntryID: entryID,
		UserID:         userID,
		OrganizationID: organizationID,
		Description:    req.Description,
		Amount:         amount,
		ExpectedDay:    req.ExpectedDay,
		IsActive:       req.IsActive,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(entry, w)
}

func (h *Handler) DeletePlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	err = h.app.FinancialService.DeletePlannedEntry(r.Context(), financialApp.DeletePlannedEntryInput{
		PlannedEntryID: entryID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]string{"message": "planned entry deleted successfully"}, w)
}

func (h *Handler) GenerateMonthlyInstances(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		Month int `json:"month"`
		Year  int `json:"year"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	instances, err := h.app.FinancialService.GenerateMonthlyInstances(r.Context(), financialApp.GenerateMonthlyInstancesInput{
		ParentEntryID:  entryID,
		UserID:         userID,
		OrganizationID: organizationID,
		Month:          req.Month,
		Year:           req.Year,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(instances, w)
}

// ============================================================================
// Monthly Snapshots
// ============================================================================

func (h *Handler) ListMonthlySnapshots(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse optional query parameters
	var categoryID, month, year *int
	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		c, err := strconv.Atoi(catStr)
		if err == nil {
			categoryID = &c
		}
	}
	if monthStr := r.URL.Query().Get("month"); monthStr != "" {
		m, err := strconv.Atoi(monthStr)
		if err == nil {
			month = &m
		}
	}
	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		y, err := strconv.Atoi(yearStr)
		if err == nil {
			year = &y
		}
	}

	snapshots, err := h.app.FinancialService.GetMonthlySnapshots(r.Context(), financialApp.GetMonthlySnapshotsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		CategoryID:     categoryID,
		Month:          month,
		Year:           year,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(snapshots, w)
}

func (h *Handler) GetMonthlySnapshot(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	snapshotID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	snapshot, err := h.app.FinancialService.GetMonthlySnapshotByID(r.Context(), financialApp.GetMonthlySnapshotByIDInput{
		SnapshotID:     snapshotID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(snapshot, w)
}

// =============================================================================
// Pattern Matching Endpoints
// =============================================================================

// GetMatchSuggestions returns pattern match suggestions for a given transaction
// GET /financial/match-suggestions?transaction_id={id}
func (h *Handler) GetMatchSuggestions(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Get transaction ID from query parameter
	transactionIDStr := r.URL.Query().Get("transaction_id")
	if transactionIDStr == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	transactionID, err := strconv.Atoi(transactionIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Optional: filter by category
	var categoryID *int
	if categoryIDStr := r.URL.Query().Get("category_id"); categoryIDStr != "" {
		if catID, err := strconv.Atoi(categoryIDStr); err == nil {
			categoryID = &catID
		}
	}

	// Get match suggestions from service
	suggestions, err := h.app.FinancialService.GetMatchSuggestionsForTransaction(r.Context(), financialApp.GetMatchSuggestionsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		TransactionID:  transactionID,
		CategoryID:     categoryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(suggestions, w)
}

// ApplyPatternToTransaction applies a saved pattern to a transaction
// POST /financial/transactions/{id}/apply-pattern
func (h *Handler) ApplyPatternToTransaction(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	transactionID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse request body for pattern ID
	var req struct {
		PatternID int `json:"pattern_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Apply pattern to transaction
	transaction, err := h.app.FinancialService.ApplyPatternToTransaction(r.Context(), financialApp.ApplyPatternToTransactionInput{
		UserID:         userID,
		OrganizationID: organizationID,
		TransactionID:  transactionID,
		PatternID:      req.PatternID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(transaction, w)
}

// SaveTransactionAsPattern saves a transaction as a reusable pattern
// POST /financial/transactions/{id}/save-as-pattern
func (h *Handler) SaveTransactionAsPattern(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	transactionID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse optional request body
	var req struct {
		IsRecurrent *bool `json:"is_recurrent"`
		ExpectedDay *int  `json:"expected_day"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// It's okay if body is empty, use defaults
		req.IsRecurrent = new(bool)
		*req.IsRecurrent = false
	}

	// Default to false if not specified
	isRecurrent := false
	if req.IsRecurrent != nil {
		isRecurrent = *req.IsRecurrent
	}

	// Save transaction as pattern
	pattern, err := h.app.FinancialService.SaveTransactionAsPattern(r.Context(), financialApp.SaveTransactionAsPatternInput{
		UserID:         userID,
		OrganizationID: organizationID,
		TransactionID:  transactionID,
		IsRecurrent:    isRecurrent,
		ExpectedDay:    req.ExpectedDay,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(pattern, w)
}

// GetTransactionPlannedEntry retrieves the planned entry linked to a transaction
// GET /financial/transactions/{id}/planned-entry
func (h *Handler) GetTransactionPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	transactionID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	entry, err := h.app.FinancialService.GetPlannedEntryForTransaction(r.Context(), financialApp.GetPlannedEntryForTransactionInput{
		TransactionID:  transactionID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Return empty object if no linked entry (instead of null for better frontend handling)
	if entry == nil {
		responses.NewSuccess(struct{}{}, w)
		return
	}

	responses.NewSuccess(entry, w)
}

// ============================================================================
// Advanced Patterns
// ============================================================================

func (h *Handler) CreateAdvancedPattern(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		DescriptionPattern string                    `json:"description_pattern"`
		DatePattern        *string                   `json:"date_pattern,omitempty"`
		WeekdayPattern     *string                   `json:"weekday_pattern,omitempty"`
		AmountRange        *financialApp.AmountRange `json:"amount_range,omitempty"`
		TargetDescription  string                    `json:"target_description"`
		TargetCategoryID   int                       `json:"target_category_id"`
		ApplyRetroactively bool                      `json:"apply_retroactively"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Validation
	if req.DescriptionPattern == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}
	if req.TargetDescription == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}
	if req.TargetCategoryID == 0 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse amount range
	var amountMin, amountMax *float64
	if req.AmountRange != nil {
		amountMin = &req.AmountRange.Min
		amountMax = &req.AmountRange.Max
	}

	pattern, err := h.app.FinancialService.CreateAdvancedPattern(r.Context(), financialApp.CreateAdvancedPatternInput{
		UserID:             userID,
		OrganizationID:     organizationID,
		DescriptionPattern: req.DescriptionPattern,
		DatePattern:        req.DatePattern,
		WeekdayPattern:     req.WeekdayPattern,
		AmountMin:          amountMin,
		AmountMax:          amountMax,
		TargetDescription:  req.TargetDescription,
		TargetCategoryID:   req.TargetCategoryID,
		ApplyRetroactively: req.ApplyRetroactively,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(pattern, w)
}

func (h *Handler) GetAdvancedPatterns(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse optional query parameters
	var isActive *bool
	var categoryID *int

	if activeStr := r.URL.Query().Get("is_active"); activeStr != "" {
		b := activeStr == "true"
		isActive = &b
	}

	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		c, err := strconv.Atoi(catStr)
		if err == nil {
			categoryID = &c
		}
	}

	patterns, err := h.app.FinancialService.GetAdvancedPatterns(r.Context(), financialApp.GetAdvancedPatternsInput{
		UserID:         userID,
		OrganizationID: organizationID,
		IsActive:       isActive,
		CategoryID:     categoryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(patterns, w)
}

func (h *Handler) GetAdvancedPattern(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	patternID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	pattern, err := h.app.FinancialService.GetAdvancedPatternByID(r.Context(), financialApp.GetAdvancedPatternByIDInput{
		PatternID:      patternID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(pattern, w)
}

func (h *Handler) UpdateAdvancedPattern(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	patternID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		IsActive          *bool   `json:"is_active,omitempty"`
		DescriptionPattern *string `json:"description_pattern,omitempty"`
		DatePattern       *string `json:"date_pattern,omitempty"`
		WeekdayPattern    *string `json:"weekday_pattern,omitempty"`
		AmountRange       *struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		} `json:"amount_range,omitempty"`
		TargetDescription *string `json:"target_description,omitempty"`
		TargetCategoryID  *int    `json:"target_category_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Convert amount_range to strings if provided
	var amountMin, amountMax *string
	if req.AmountRange != nil {
		minStr := fmt.Sprintf("%.2f", req.AmountRange.Min)
		maxStr := fmt.Sprintf("%.2f", req.AmountRange.Max)
		amountMin = &minStr
		amountMax = &maxStr
	}

	pattern, err := h.app.FinancialService.UpdateAdvancedPattern(r.Context(), financialApp.UpdateAdvancedPatternInput{
		PatternID:          patternID,
		UserID:             userID,
		OrganizationID:     organizationID,
		IsActive:           req.IsActive,
		DescriptionPattern: req.DescriptionPattern,
		DatePattern:        req.DatePattern,
		WeekdayPattern:     req.WeekdayPattern,
		AmountMin:          amountMin,
		AmountMax:          amountMax,
		TargetDescription:  req.TargetDescription,
		TargetCategoryID:   req.TargetCategoryID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(pattern, w)
}

func (h *Handler) DeleteAdvancedPattern(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	patternID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	err = h.app.FinancialService.DeleteAdvancedPattern(r.Context(), financialApp.DeleteAdvancedPatternInput{
		PatternID:      patternID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]string{"message": "advanced pattern deleted successfully"}, w)
}

// ApplyPatternRetroactively applies a pattern to all existing uncategorized transactions
func (h *Handler) ApplyPatternRetroactively(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	patternID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	result, err := h.app.FinancialService.ApplyPatternRetroactivelySync(r.Context(), financialApp.ApplyPatternRetroactivelyInput{
		PatternID:      patternID,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]int{
		"updated_count": result.UpdatedCount,
		"total_checked": result.TotalChecked,
	}, w)
}

// ============================================================================
// Income Planning
// ============================================================================

func (h *Handler) GetIncomePlanning(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse query parameters
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	if monthStr == "" || yearStr == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2020 || year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	report, err := h.app.FinancialService.GetIncomePlanning(r.Context(), financialApp.GetIncomePlanningInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(report, w)
}

// ============================================================================
// Planned Entry Statuses (Entrada Planejada)
// ============================================================================

// GetPlannedEntriesForMonth returns planned entries with their status for a given month/year
// GET /financial/planned-entries/month?month=X&year=Y
func (h *Handler) GetPlannedEntriesForMonth(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	// Parse required query parameters
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	if monthStr == "" || yearStr == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	entries, err := h.app.FinancialService.GetPlannedEntriesForMonth(r.Context(), financialApp.GetPlannedEntriesForMonthInput{
		UserID:         userID,
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(entries, w)
}

// MatchPlannedEntry matches a transaction to a planned entry for a specific month
// POST /financial/planned-entries/{id}/match
func (h *Handler) MatchPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		TransactionID int `json:"transaction_id"`
		Month         int `json:"month"`
		Year          int `json:"year"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Validation
	if req.TransactionID == 0 || req.Month < 1 || req.Month > 12 || req.Year < 2000 || req.Year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	status, err := h.app.FinancialService.MatchPlannedEntryToTransaction(r.Context(), financialApp.MatchPlannedEntryInput{
		PlannedEntryID: entryID,
		TransactionID:  req.TransactionID,
		Month:          req.Month,
		Year:           req.Year,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(status, w)
}

// UnmatchPlannedEntry removes the match between a planned entry and a transaction
// DELETE /financial/planned-entries/{id}/match
func (h *Handler) UnmatchPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse query parameters for month/year
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	if monthStr == "" || yearStr == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	err = h.app.FinancialService.UnmatchPlannedEntry(r.Context(), financialApp.UnmatchPlannedEntryInput{
		PlannedEntryID: entryID,
		Month:          month,
		Year:           year,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(map[string]string{"message": "planned entry unmatched successfully"}, w)
}

// DismissPlannedEntry dismisses a planned entry for a specific month
// POST /financial/planned-entries/{id}/dismiss
func (h *Handler) DismissPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	var req struct {
		Month  int     `json:"month"`
		Year   int     `json:"year"`
		Reason *string `json:"reason,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Validation
	if req.Month < 1 || req.Month > 12 || req.Year < 2000 || req.Year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Convert optional reason to string
	reason := ""
	if req.Reason != nil {
		reason = *req.Reason
	}

	status, err := h.app.FinancialService.DismissPlannedEntry(r.Context(), financialApp.DismissPlannedEntryInput{
		PlannedEntryID: entryID,
		Month:          req.Month,
		Year:           req.Year,
		Reason:         reason,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(status, w)
}

// UndismissPlannedEntry undismisses a planned entry for a specific month
// DELETE /financial/planned-entries/{id}/dismiss
func (h *Handler) UndismissPlannedEntry(w http.ResponseWriter, r *http.Request) {
	userID, organizationID, err := h.getSessionInfo(r)
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	entryID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Parse query parameters for month/year
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	if monthStr == "" || yearStr == "" {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > 2100 {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	status, err := h.app.FinancialService.UndismissPlannedEntry(r.Context(), financialApp.UndismissPlannedEntryInput{
		PlannedEntryID: entryID,
		Month:          month,
		Year:           year,
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	responses.NewSuccess(status, w)
}
