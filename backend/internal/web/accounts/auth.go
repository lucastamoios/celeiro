package accounts

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/internal/web/validators"
)

type AccountsAuthHandler interface {
	RequestMagicLink(w http.ResponseWriter, r *http.Request)
	RequestMagicLinkForExistingUser(w http.ResponseWriter, r *http.Request)
	Authenticate(w http.ResponseWriter, r *http.Request)
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
		CheckUserExists: false,
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

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}
