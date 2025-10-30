package financial

import (
	"encoding/json"
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
		Name string `json:"name"`
		Icon string `json:"icon"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	category, err := h.app.FinancialService.CreateCategory(r.Context(), financialApp.CreateCategoryInput{
		Name:   req.Name,
		Icon:   req.Icon,
		UserID: userID,
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
		limit = 50
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

	// Read file content
	fileBytes := make([]byte, 10<<20)
	n, err := file.Read(fileBytes)
	if err != nil && err.Error() != "EOF" {
		responses.NewError(w, err)
		return
	}
	fileBytes = fileBytes[:n]

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
