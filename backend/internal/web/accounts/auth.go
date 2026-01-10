package accounts

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/internal/web/validators"
	"github.com/shopspring/decimal"
)

type AccountsAuthHandler interface {
	RequestMagicLink(w http.ResponseWriter, r *http.Request)
	RequestMagicLinkForExistingUser(w http.ResponseWriter, r *http.Request)
	Authenticate(w http.ResponseWriter, r *http.Request)
	AuthenticateWithGoogle(w http.ResponseWriter, r *http.Request)
	AuthenticateWithPassword(w http.ResponseWriter, r *http.Request)
	SetPassword(w http.ResponseWriter, r *http.Request)
}

// RequestMagicLink

type RequestMagicLinkRequest struct {
	Email string `json:"email"`
}

type RequestMagicLinkResponse struct {
	Message string `json:"message"`
}

func (r *RequestMagicLinkRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.ErrEmailRequired
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.ErrEmailFormatInvalid
	}
	return nil
}

func (h *handler) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	var req RequestMagicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, err)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	_, err := h.accountsService.RequestMagicLinkViaEmail(r.Context(), accounts.RequestMagicLinkViaEmailInput{
		Email:           req.Email,
		CheckUserExists: true, // Only allow registered users
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	m := RequestMagicLinkResponse{
		Message: "Login code sent to your email",
	}
	responses.NewSuccess(m, w)
}

func (h *handler) RequestMagicLinkForExistingUser(w http.ResponseWriter, r *http.Request) {
	var req RequestMagicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrMissingRequiredFields)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, errors.ErrMissingRequiredFields)
		return
	}

	_, err := h.accountsService.RequestMagicLinkViaEmail(r.Context(), accounts.RequestMagicLinkViaEmailInput{
		Email:           req.Email,
		CheckUserExists: true,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	m := RequestMagicLinkResponse{
		Message: "Login code sent to your email",
	}
	responses.NewSuccess(m, w)
}

// Authenticate

type AuthenticateRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

func (r *AuthenticateRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.ErrEmailRequired
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.ErrEmailFormatInvalid
	}
	if strings.TrimSpace(r.Code) == "" {
		return errors.ErrCodeRequired
	}
	if len(strings.TrimSpace(r.Code)) != 4 {
		return errors.ErrCodeFormatInvalid
	}
	return nil
}

type AuthenticateResponse struct {
	SessionToken     string              `json:"session_token"`
	SessionCreatedAt string              `json:"session_created_at"`
	SessionExpiresAt string              `json:"session_expires_at"`
	IsNewUser        bool                `json:"is_new_user"`
	SessionInfo      SessionInfoResponse `json:"session_info"`
}

func (r AuthenticateResponse) FromDTO(dto accounts.Authentication) AuthenticateResponse {
	organizations := []OrganizationForSessionInfoResponse{}
	for _, organization := range dto.Session.Info.Organizations {
		organizations = append(organizations, OrganizationForSessionInfoResponse{}.FromDTO(&organization))
	}

	response := AuthenticateResponse{
		SessionToken:     dto.Session.Token,
		SessionCreatedAt: dto.Session.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		SessionExpiresAt: dto.Session.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		IsNewUser:        dto.IsNewUser,
		SessionInfo:      SessionInfoResponse{}.FromDTO(&dto.Session.Info, dto.IsNewUser),
	}
	return response
}

func (h *handler) Authenticate(w http.ResponseWriter, r *http.Request) {
	var req AuthenticateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, err)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	authResult, err := h.accountsService.AuthenticateWithMagicCode(r.Context(), accounts.AuthenticateWithMagicCodeInput{
		Email: req.Email,
		Code:  strings.TrimSpace(req.Code),
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Create a default account for new users so they can start using the app immediately
	if authResult.IsNewUser && len(authResult.Session.Info.Organizations) > 0 {
		userID := authResult.Session.Info.User.ID
		orgID := authResult.Session.Info.Organizations[0].OrganizationID

		if _, err := h.financialService.CreateAccount(r.Context(), financial.CreateAccountInput{
			UserID:         userID,
			OrganizationID: orgID,
			Name:           "Conta Principal",
			AccountType:    "checking",
			BankName:       "Meu Banco",
			Balance:        decimal.Zero,
			Currency:       "BRL",
		}); err != nil {
			// Best-effort: log the error but don't fail auth (user can create manually)
			log.Printf("[WARN] failed to create default account for new user: user_id=%d org_id=%d error=%v", userID, orgID, err)
		}
	}

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}

// AuthenticateWithGoogle

type GoogleAuthRequest struct {
	AccessToken string `json:"access_token"`
}

func (r *GoogleAuthRequest) Validate() error {
	if strings.TrimSpace(r.AccessToken) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

func (h *handler) AuthenticateWithGoogle(w http.ResponseWriter, r *http.Request) {
	var req GoogleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, err)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	authResult, err := h.accountsService.AuthenticateWithGoogle(r.Context(), accounts.AuthenticateWithGoogleInput{
		AccessToken: req.AccessToken,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Create a default account for new users so they can start using the app immediately
	if authResult.IsNewUser && len(authResult.Session.Info.Organizations) > 0 {
		userID := authResult.Session.Info.User.ID
		orgID := authResult.Session.Info.Organizations[0].OrganizationID

		if _, err := h.financialService.CreateAccount(r.Context(), financial.CreateAccountInput{
			UserID:         userID,
			OrganizationID: orgID,
			Name:           "Conta Principal",
			AccountType:    "checking",
			BankName:       "Meu Banco",
			Balance:        decimal.Zero,
			Currency:       "BRL",
		}); err != nil {
			// Best-effort: log the error but don't fail auth (user can create manually)
			log.Printf("[WARN] failed to create default account for new user (Google auth): user_id=%d org_id=%d error=%v", userID, orgID, err)
		}
	}

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}

// AuthenticateWithPassword

type PasswordAuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *PasswordAuthRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.ErrEmailRequired
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.ErrEmailFormatInvalid
	}
	if strings.TrimSpace(r.Password) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

func (h *handler) AuthenticateWithPassword(w http.ResponseWriter, r *http.Request) {
	var req PasswordAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, err)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	authResult, err := h.accountsService.AuthenticateWithPassword(r.Context(), accounts.AuthenticateWithPasswordInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}

// SetPassword

type SetPasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (r *SetPasswordRequest) Validate() error {
	if strings.TrimSpace(r.NewPassword) == "" {
		return errors.ErrMissingRequiredFields
	}
	if len(r.NewPassword) < accounts.MinPasswordLength {
		return errors.ErrInvalidFormat
	}
	return nil
}

type SetPasswordResponse struct {
	Message string `json:"message"`
}

func (h *handler) SetPassword(w http.ResponseWriter, r *http.Request) {
	var req SetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, err)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	// Get user ID from session context
	session, err := h.accountsService.GetSessionFromContext(r.Context())
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	err = h.accountsService.SetPassword(r.Context(), accounts.SetPasswordInput{
		UserID:      session.Info.User.ID,
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := SetPasswordResponse{
		Message: "Password updated successfully",
	}
	responses.NewSuccess(response, w)
}
