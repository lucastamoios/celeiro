package accounts

import "time"

type User struct {
	UserID    int
	Name      string
	Email     string
	Phone     int
	CreatedAt time.Time
	UpdatedAt time.Time
	Address   string
	City      string
	State     string
	Zip       string
	Country   string
	Latitude  float64
	Longitude float64
}

func (u User) FromModel(model *UserModel) User {
	return User{
		UserID:    model.UserID,
		Name:      model.Name,
		Email:     model.Email,
		Phone:     model.Phone,
		CreatedAt: model.CreatedAt,
		UpdatedAt: model.UpdatedAt,
		Address:   model.Address,
		City:      model.City,
		State:     model.State,
		Zip:       model.Zip,
		Country:   model.Country,
		Latitude:  model.Latitude,
		Longitude: model.Longitude,
	}
}

type Users []User

func (u Users) FromModel(model UsersModel) Users {
	users := make(Users, len(model))
	for i, model := range model {
		users[i] = User{}.FromModel(&model)
	}
	return users
}

type Organization struct {
	OrganizationID int
	Name           string
	Address        string
	City           string
	State          string
	Zip            string
	Country        string
	Latitude       float64
	Longitude      float64
}

func (o Organization) FromModel(model OrganizationModel) Organization {
	return Organization{
		OrganizationID: model.OrganizationID,
		Name:           model.Name,
		Address:        model.Address,
		City:           model.City,
		State:          model.State,
		Zip:            model.Zip,
		Country:        model.Country,
		Latitude:       model.Latitude,
		Longitude:      model.Longitude,
	}
}

type UserOrganization struct {
	OrganizationID int
	UserID         int
}

func (u UserOrganization) FromModel(model UserOrganizationModel) UserOrganization {
	return UserOrganization{
		OrganizationID: model.OrganizationID,
		UserID:         model.UserID,
	}
}

type OrganizationWithPermissions struct {
	Organization
	UserRole        Role
	UserPermissions []Permission
	IsDefault       bool
}

func (o OrganizationWithPermissions) FromModel(model OrganizationWithPermissionsModel) OrganizationWithPermissions {
	permissions := make([]Permission, len(model.UserPermissions))
	for i, p := range model.UserPermissions {
		permissions[i] = Permission(p)
	}

	return OrganizationWithPermissions{
		Organization:    Organization{}.FromModel(model.OrganizationModel),
		UserRole:        model.UserRole,
		UserPermissions: permissions,
		IsDefault:       model.IsDefault,
	}
}

type OrganizationsWithPermission []OrganizationWithPermissions

func (o OrganizationsWithPermission) FromModel(model []OrganizationWithPermissionsModel) OrganizationsWithPermission {
	organizations := make(OrganizationsWithPermission, len(model))
	for i, model := range model {
		organizations[i] = OrganizationWithPermissions{}.FromModel(model)
	}
	return organizations
}

type UserForSessionInfo struct {
	ID          int
	Name        string
	Email       string
	Phone       int
	Address     string
	City        string
	State       string
	Zip         string
	Country     string
	Latitude    float64
	Longitude   float64
	HasPassword bool
}

func (u UserForSessionInfo) FromUser(user UserModel) UserForSessionInfo {
	return UserForSessionInfo{
		ID:          user.UserID,
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
		HasPassword: user.PasswordHash.Valid && user.PasswordHash.String != "",
	}
}

type SessionInfo struct {
	User          UserForSessionInfo
	Organizations []OrganizationWithPermissions
}

func (s SessionInfo) FromUserAndOrganizations(user UserModel, organizations []OrganizationWithPermissions) SessionInfo {
	return SessionInfo{
		User:          UserForSessionInfo{}.FromUser(user),
		Organizations: organizations,
	}
}

type Session struct {
	Token     string
	Info      SessionInfo
	CreatedAt time.Time
	ExpiresAt time.Time
}

type Authentication struct {
	Session   Session
	IsNewUser bool
}

type MagicCode struct {
	Code      string    `json:"code"`
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"expires_at"`
}

type OrganizationInvite struct {
	InviteID        int
	OrganizationID  int
	Email           string
	Role            Role
	Token           string
	InvitedByUserID int
	CreatedAt       time.Time
	ExpiresAt       time.Time
	AcceptedAt      *time.Time
}

func (o OrganizationInvite) FromModel(model OrganizationInviteModel) OrganizationInvite {
	var acceptedAt *time.Time
	if model.AcceptedAt.Valid {
		acceptedAt = &model.AcceptedAt.Time
	}

	return OrganizationInvite{
		InviteID:        model.InviteID,
		OrganizationID:  model.OrganizationID,
		Email:           model.Email,
		Role:            model.Role,
		Token:           model.Token,
		InvitedByUserID: model.InvitedByUserID,
		CreatedAt:       model.CreatedAt,
		ExpiresAt:       model.ExpiresAt,
		AcceptedAt:      acceptedAt,
	}
}

type OrganizationInvites []OrganizationInvite

func (o OrganizationInvites) FromModel(models []OrganizationInviteModel) OrganizationInvites {
	invites := make(OrganizationInvites, len(models))
	for i, model := range models {
		invites[i] = OrganizationInvite{}.FromModel(model)
	}
	return invites
}

type OrganizationMember struct {
	UserID    int
	Name      string
	Email     string
	UserRole  Role
	IsDefault bool
	JoinedAt  time.Time
}

func (o OrganizationMember) FromModel(model OrganizationMemberModel) OrganizationMember {
	return OrganizationMember{
		UserID:    model.UserID,
		Name:      model.Name,
		Email:     model.Email,
		UserRole:  model.UserRole,
		IsDefault: model.IsDefault,
		JoinedAt:  model.JoinedAt,
	}
}

type OrganizationMembers []OrganizationMember

func (o OrganizationMembers) FromModel(models []OrganizationMemberModel) OrganizationMembers {
	members := make(OrganizationMembers, len(models))
	for i, model := range models {
		members[i] = OrganizationMember{}.FromModel(model)
	}
	return members
}
