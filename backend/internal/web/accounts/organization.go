package accounts

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/internal/web/validators"
	"github.com/go-chi/chi/v5"
)

type OrganizationHandler interface {
	GetOrganizationMembers(w http.ResponseWriter, r *http.Request)
	UpdateOrganization(w http.ResponseWriter, r *http.Request)
	SetDefaultOrganization(w http.ResponseWriter, r *http.Request)
	CreateOrganizationInvite(w http.ResponseWriter, r *http.Request)
	GetPendingInvites(w http.ResponseWriter, r *http.Request)
	CancelOrganizationInvite(w http.ResponseWriter, r *http.Request)
	AcceptOrganizationInvite(w http.ResponseWriter, r *http.Request)
}

// GetOrganizationMembers

func (h *handler) GetOrganizationMembers(w http.ResponseWriter, r *http.Request) {
	orgIDStr := chi.URLParam(r, "orgId")
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	members, err := h.accountsService.GetOrganizationMembers(r.Context(), accounts.GetOrganizationMembersInput{
		OrganizationID: orgID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	memberResponses := make([]OrganizationMemberResponse, len(members))
	for i, member := range members {
		memberResponses[i] = OrganizationMemberResponse{}.FromDTO(&member)
	}

	responses.NewSuccess(memberResponses, w)
}

// UpdateOrganization

type UpdateOrganizationRequest struct {
	Name *string `json:"name"`
}

func (r *UpdateOrganizationRequest) Validate() error {
	if r.Name == nil {
		return errors.ErrMissingRequiredFields
	}
	if strings.TrimSpace(*r.Name) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

func (h *handler) UpdateOrganization(w http.ResponseWriter, r *http.Request) {
	orgIDStr := chi.URLParam(r, "orgId")
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	var req UpdateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	org, err := h.accountsService.UpdateOrganization(r.Context(), accounts.UpdateOrganizationInput{
		OrganizationID: orgID,
		Name:           req.Name,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	// Update the organization in the user's session so refreshSession returns fresh data
	session, err := h.accountsService.GetSessionFromContext(r.Context())
	if err == nil && req.Name != nil {
		// Best effort - don't fail the request if session update fails
		_ = h.accountsService.UpdateOrganizationInSession(r.Context(), accounts.UpdateOrganizationInSessionInput{
			SessionToken:   session.Token,
			OrganizationID: orgID,
			Name:           *req.Name,
		})
	}

	response := OrganizationResponse{}.FromDTO(&org)
	responses.NewSuccess(response, w)
}

// SetDefaultOrganization

type SetDefaultOrganizationRequest struct {
	OrganizationID int `json:"organization_id"`
}

func (r *SetDefaultOrganizationRequest) Validate() error {
	if r.OrganizationID <= 0 {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

type SetDefaultOrganizationResponse struct {
	Message string `json:"message"`
}

func (h *handler) SetDefaultOrganization(w http.ResponseWriter, r *http.Request) {
	var req SetDefaultOrganizationRequest
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

	err = h.accountsService.SetDefaultOrganization(r.Context(), accounts.SetDefaultOrganizationInput{
		UserID:         session.Info.User.ID,
		OrganizationID: req.OrganizationID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := SetDefaultOrganizationResponse{
		Message: "Default organization updated",
	}
	responses.NewSuccess(response, w)
}

// CreateOrganizationInvite

type CreateOrganizationInviteRequest struct {
	Email string        `json:"email"`
	Role  accounts.Role `json:"role"`
}

func (r *CreateOrganizationInviteRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.ErrEmailRequired
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.ErrEmailFormatInvalid
	}
	if !r.Role.IsValid() {
		return errors.ErrInvalidFormat
	}
	return nil
}

func (h *handler) CreateOrganizationInvite(w http.ResponseWriter, r *http.Request) {
	orgIDStr := chi.URLParam(r, "orgId")
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	var req CreateOrganizationInviteRequest
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

	invite, err := h.accountsService.CreateOrganizationInvite(r.Context(), accounts.CreateOrganizationInviteInput{
		OrganizationID:  orgID,
		Email:           req.Email,
		Role:            req.Role,
		InvitedByUserID: session.Info.User.ID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := OrganizationInviteResponse{}.FromDTO(&invite)
	responses.NewSuccess(response, w)
}

// GetPendingInvites

func (h *handler) GetPendingInvites(w http.ResponseWriter, r *http.Request) {
	orgIDStr := chi.URLParam(r, "orgId")
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	invites, err := h.accountsService.GetPendingInvites(r.Context(), accounts.GetPendingInvitesInput{
		OrganizationID: orgID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	inviteResponses := make([]OrganizationInviteResponse, len(invites))
	for i, invite := range invites {
		inviteResponses[i] = OrganizationInviteResponse{}.FromDTO(&invite)
	}

	responses.NewSuccess(inviteResponses, w)
}

// CancelOrganizationInvite

func (h *handler) CancelOrganizationInvite(w http.ResponseWriter, r *http.Request) {
	orgIDStr := chi.URLParam(r, "orgId")
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	inviteIDStr := chi.URLParam(r, "inviteId")
	inviteID, err := strconv.Atoi(inviteIDStr)
	if err != nil {
		responses.NewError(w, errors.ErrInvalidFormat)
		return
	}

	err = h.accountsService.CancelOrganizationInvite(r.Context(), accounts.CancelOrganizationInviteInput{
		InviteID:       inviteID,
		OrganizationID: orgID,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := map[string]string{"message": "Invite cancelled"}
	responses.NewSuccess(response, w)
}

// AcceptOrganizationInvite

type AcceptOrganizationInviteRequest struct {
	Token string `json:"token"`
}

func (r *AcceptOrganizationInviteRequest) Validate() error {
	if strings.TrimSpace(r.Token) == "" {
		return errors.ErrMissingRequiredFields
	}
	return nil
}

func (h *handler) AcceptOrganizationInvite(w http.ResponseWriter, r *http.Request) {
	var req AcceptOrganizationInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	if err := req.Validate(); err != nil {
		responses.NewError(w, err)
		return
	}

	authResult, err := h.accountsService.AcceptOrganizationInvite(r.Context(), accounts.AcceptOrganizationInviteInput{
		Token: req.Token,
	})
	if err != nil {
		responses.NewError(w, err)
		return
	}

	response := AuthenticateResponse{}.FromDTO(authResult)
	responses.NewSuccess(response, w)
}
