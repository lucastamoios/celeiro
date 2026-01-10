package accounts

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/internal/web/validators"
)

type BackofficeHandler interface {
	GetAllUsers(w http.ResponseWriter, r *http.Request)
	CreateSystemInvite(w http.ResponseWriter, r *http.Request)
	AcceptSystemInvite(w http.ResponseWriter, r *http.Request)
	GetPendingSystemInvites(w http.ResponseWriter, r *http.Request)
}

// GetAllUsers returns all users in the system

type SystemUserResponse struct {
	UserID        int                              `json:"user_id"`
	Name          string                           `json:"name"`
	Email         string                           `json:"email"`
	CreatedAt     string                           `json:"created_at"`
	HasPassword   bool                             `json:"has_password"`
	Organizations []SystemUserOrganizationResponse `json:"organizations"`
}

type SystemUserOrganizationResponse struct {
	OrganizationID   int           `json:"organization_id"`
	OrganizationName string        `json:"organization_name"`
	UserRole         accounts.Role `json:"user_role"`
}

func (r SystemUserResponse) FromDTO(user *accounts.SystemUser) SystemUserResponse {
	orgs := make([]SystemUserOrganizationResponse, len(user.Organizations))
	for i, org := range user.Organizations {
		orgs[i] = SystemUserOrganizationResponse{
			OrganizationID:   org.OrganizationID,
			OrganizationName: org.OrganizationName,
			UserRole:         org.UserRole,
		}
	}

	return SystemUserResponse{
		UserID:        user.UserID,
		Name:          user.Name,
		Email:         user.Email,
		CreatedAt:     user.CreatedAt.Format(time.RFC3339),
		HasPassword:   user.HasPassword,
		Organizations: orgs,
	}
}

func (h *handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.accountsService.GetAllUsers(r.Context())
	if err != nil {
		responses.NewError(w, err)
		return
	}

	userResponses := make([]SystemUserResponse, len(users))
	for i, user := range users {
		userResponses[i] = SystemUserResponse{}.FromDTO(&user)
	}

	responses.NewSuccess(userResponses, w)
}

// CreateSystemInvite

type CreateSystemInviteRequest struct {
	Email            string `json:"email"`
	OrganizationName string `json:"organization_name"`
}

func (r *CreateSystemInviteRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.ErrEmailRequired
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.ErrEmailFormatInvalid
	}
	if strings.TrimSpace(r.OrganizationName) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

type SystemInviteResponse struct {
	InviteID         int    `json:"invite_id"`
	Email            string `json:"email"`
	OrganizationName string `json:"organization_name"`
	CreatedAt        string `json:"created_at"`
	ExpiresAt        string `json:"expires_at"`
}

func (r SystemInviteResponse) FromDTO(invite *accounts.SystemInvite) SystemInviteResponse {
	return SystemInviteResponse{
		InviteID:         invite.InviteID,
		Email:            invite.Email,
		OrganizationName: invite.OrganizationName,
		CreatedAt:        invite.CreatedAt.Format(time.RFC3339),
		ExpiresAt:        invite.ExpiresAt.Format(time.RFC3339),
	}
}

func (h *handler) CreateSystemInvite(w http.ResponseWriter, r *http.Request) {
	var req CreateSystemInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	session, err := h.accountsService.GetSessionFromContext(r.Context())
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	invite, err := h.accountsService.CreateSystemInvite(r.Context(), accounts.CreateSystemInviteInput{
		Email:            req.Email,
		OrganizationName: req.OrganizationName,
		InvitedByUserID:  session.Info.User.ID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := SystemInviteResponse{}.FromDTO(&invite)
	responses.NewSuccess(response, w)
}

// AcceptSystemInvite

type AcceptSystemInviteRequest struct {
	Token string `json:"token"`
}

func (r *AcceptSystemInviteRequest) Validate() error {
	if strings.TrimSpace(r.Token) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

func (h *handler) AcceptSystemInvite(w http.ResponseWriter, r *http.Request) {
	var req AcceptSystemInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	authResult, err := h.accountsService.AcceptSystemInvite(r.Context(), accounts.AcceptSystemInviteInput{
		Token: req.Token,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}

// GetPendingSystemInvites

func (h *handler) GetPendingSystemInvites(w http.ResponseWriter, r *http.Request) {
	invites, err := h.accountsService.GetPendingSystemInvites(r.Context())
	if err != nil {
		responses.NewError(w, err)
		return
	}

	inviteResponses := make([]SystemInviteResponse, len(invites))
	for i, invite := range invites {
		inviteResponses[i] = SystemInviteResponse{}.FromDTO(&invite)
	}

	responses.NewSuccess(inviteResponses, w)
}
