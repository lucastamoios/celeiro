package accounts

import "github.com/catrutech/celeiro/internal/application/accounts"

type OrganizationForSessionInfoResponse struct {
	OrganizationID  int                   `json:"organization_id"`
	Name            string                `json:"name"`
	Address         string                `json:"address"`
	City            string                `json:"city"`
	State           string                `json:"state"`
	Zip             string                `json:"zip"`
	Country         string                `json:"country"`
	Latitude        float64               `json:"latitude"`
	Longitude       float64               `json:"longitude"`
	UserRole        accounts.Role         `json:"user_role"`
	UserPermissions []accounts.Permission `json:"user_permissions"`
	IsDefault       bool                  `json:"is_default"`
}

func (o OrganizationForSessionInfoResponse) FromDTO(organization *accounts.OrganizationWithPermissions) OrganizationForSessionInfoResponse {
	return OrganizationForSessionInfoResponse{
		OrganizationID:  organization.OrganizationID,
		Name:            organization.Name,
		Address:         organization.Address,
		City:            organization.City,
		State:           organization.State,
		Zip:             organization.Zip,
		Country:         organization.Country,
		Latitude:        organization.Latitude,
		Longitude:       organization.Longitude,
		UserRole:        organization.UserRole,
		UserPermissions: organization.UserPermissions,
		IsDefault:       organization.IsDefault,
	}
}

type UserForSessionInfoResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	EmailID     string  `json:"email_id"`
	Phone       int     `json:"phone"`
	Address     string  `json:"address"`
	City        string  `json:"city"`
	State       string  `json:"state"`
	Zip         string  `json:"zip"`
	Country     string  `json:"country"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	HasPassword bool    `json:"has_password"`
}

func (u UserForSessionInfoResponse) FromDTO(user *accounts.UserForSessionInfo) UserForSessionInfoResponse {
	return UserForSessionInfoResponse{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		EmailID:     user.EmailID,
		Phone:       user.Phone,
		Address:     user.Address,
		City:        user.City,
		State:       user.State,
		Zip:         user.Zip,
		Country:     user.Country,
		Latitude:    user.Latitude,
		Longitude:   user.Longitude,
		HasPassword: user.HasPassword,
	}
}

type SessionInfoResponse struct {
	User          UserForSessionInfoResponse           `json:"user"`
	Organizations []OrganizationForSessionInfoResponse `json:"organizations"`
	IsNewUser     bool                                 `json:"is_new_user"`
}

func (s SessionInfoResponse) FromDTO(session *accounts.SessionInfo, isNewUser bool) SessionInfoResponse {
	organizations := make([]OrganizationForSessionInfoResponse, len(session.Organizations))
	for i, organization := range session.Organizations {
		organizations[i] = OrganizationForSessionInfoResponse{}.FromDTO(&organization)
	}

	return SessionInfoResponse{
		User:          UserForSessionInfoResponse{}.FromDTO(&session.User),
		Organizations: organizations,
		IsNewUser:     isNewUser,
	}
}

// Organization

type OrganizationResponse struct {
	OrganizationID int     `json:"organization_id"`
	Name           string  `json:"name"`
	City           string  `json:"city"`
	State          string  `json:"state"`
	Zip            string  `json:"zip"`
	Country        string  `json:"country"`
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
}

func (o OrganizationResponse) FromDTO(org *accounts.Organization) OrganizationResponse {
	return OrganizationResponse{
		OrganizationID: org.OrganizationID,
		Name:           org.Name,
		City:           org.City,
		State:          org.State,
		Zip:            org.Zip,
		Country:        org.Country,
		Latitude:       org.Latitude,
		Longitude:      org.Longitude,
	}
}

// Organization Members

type OrganizationMemberResponse struct {
	UserID    int           `json:"user_id"`
	Name      string        `json:"name"`
	Email     string        `json:"email"`
	UserRole  accounts.Role `json:"user_role"`
	IsDefault bool          `json:"is_default"`
	JoinedAt  string        `json:"joined_at"`
}

func (m OrganizationMemberResponse) FromDTO(member *accounts.OrganizationMember) OrganizationMemberResponse {
	return OrganizationMemberResponse{
		UserID:    member.UserID,
		Name:      member.Name,
		Email:     member.Email,
		UserRole:  member.UserRole,
		IsDefault: member.IsDefault,
		JoinedAt:  member.JoinedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// Organization Invites

type OrganizationInviteResponse struct {
	InviteID   int           `json:"invite_id"`
	Email      string        `json:"email"`
	Role       accounts.Role `json:"role"`
	CreatedAt  string        `json:"created_at"`
	ExpiresAt  string        `json:"expires_at"`
	AcceptedAt *string       `json:"accepted_at"`
}

func (i OrganizationInviteResponse) FromDTO(invite *accounts.OrganizationInvite) OrganizationInviteResponse {
	var acceptedAt *string
	if invite.AcceptedAt != nil {
		formatted := invite.AcceptedAt.Format("2006-01-02T15:04:05Z07:00")
		acceptedAt = &formatted
	}

	return OrganizationInviteResponse{
		InviteID:   invite.InviteID,
		Email:      invite.Email,
		Role:       invite.Role,
		CreatedAt:  invite.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		ExpiresAt:  invite.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		AcceptedAt: acceptedAt,
	}
}
