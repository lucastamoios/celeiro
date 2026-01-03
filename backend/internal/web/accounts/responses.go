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
	}
}

type UserForSessionInfoResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
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
