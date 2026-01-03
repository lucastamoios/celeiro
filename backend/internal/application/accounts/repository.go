package accounts

import (
	"context"
	"time"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/catrutech/celeiro/pkg/system"
)

type Repository interface {
	FetchUser(ctx context.Context, params getUserParams) (UserModel, error)
	FetchUserByID(ctx context.Context, params getUserByIDParams) (UserModel, error)
	FetchUsers(ctx context.Context, params getUsersParams) ([]UserModel, error)
	InsertUser(ctx context.Context, user createUserParams) (UserModel, error)
	ModifyUser(ctx context.Context, params updateUserParams) (UserModel, error)
	ModifyUserPassword(ctx context.Context, params modifyUserPasswordParams) error
	FetchOrganizationsByUser(ctx context.Context, params getOrganizationByUsersParams) ([]OrganizationWithPermissionsModel, error)
	InsertOrganization(ctx context.Context, params insertOrganizationParams) (OrganizationModel, error)
	InsertUserOrganization(ctx context.Context, params createUserOrganizationParams) (UserOrganizationModel, error)
	FetchUserByEmail(ctx context.Context, params getUserByEmailParams) (UserModel, error)
	FetchOrganization(ctx context.Context, params getOrganizationParams) (OrganizationModel, error)

	// Organization Members
	FetchOrganizationMembers(ctx context.Context, params fetchOrganizationMembersParams) ([]OrganizationMemberModel, error)
	FetchUserOrganization(ctx context.Context, params fetchUserOrganizationParams) (UserOrganizationModel, error)

	// Default Organization
	ModifyDefaultOrganization(ctx context.Context, params modifyDefaultOrganizationParams) error

	// Organization Invites
	InsertOrganizationInvite(ctx context.Context, params insertOrganizationInviteParams) (OrganizationInviteModel, error)
	FetchOrganizationInviteByToken(ctx context.Context, params fetchOrganizationInviteByTokenParams) (OrganizationInviteModel, error)
	FetchOrganizationInvitesByOrg(ctx context.Context, params fetchOrganizationInvitesByOrgParams) ([]OrganizationInviteModel, error)
	ModifyOrganizationInviteAccepted(ctx context.Context, params modifyOrganizationInviteAcceptedParams) error
	DeleteOrganizationInvite(ctx context.Context, params deleteOrganizationInviteParams) error
}

type repository struct {
	db     database.Database
	system *system.System
}

func NewRepository(db database.Database) Repository {
	return &repository{
		db:     db,
		system: system.NewSystem(),
	}
}

func NewWithSystem(db database.Database, sys *system.System) Repository {
	return &repository{
		db:     db,
		system: sys,
	}
}

// CreateOrganization

// InsertOrganizationQuery is used to insert a new organization into the database.
// TODO add other fields like city, state, zip, country, latitude, longitude
const InsertOrganizationQuery = `
	-- accounts.insertOrganizationQuery
	INSERT INTO organizations 
	(name) VALUES 
	($1)
	RETURNING organization_id,
			  name,
			  city,
			  state,
			  zip,
			  country,
			  latitude,
			  longitude;
	`

type insertOrganizationParams struct {
	Name string
}

func (r *repository) InsertOrganization(ctx context.Context, params insertOrganizationParams) (OrganizationModel, error) {
	var result OrganizationModel
	err := r.db.Query(ctx, &result, InsertOrganizationQuery, params.Name)
	if err != nil {
		return OrganizationModel{}, err
	}

	return result, nil
}

// CreateUserOrganization

type createUserOrganizationParams struct {
	UserID         int
	OrganizationID int
	Role           Role
}

const InsertUserOrganizationQuery = `
	-- accounts.insertUserOrganizationQuery
	INSERT INTO user_organizations 
	(user_id, organization_id, user_role) VALUES 
	($1, $2, $3)
	RETURNING user_id, organization_id, user_role;
	`

func (r *repository) InsertUserOrganization(ctx context.Context, params createUserOrganizationParams) (UserOrganizationModel, error) {
	var result UserOrganizationModel
	err := r.db.Query(ctx, &result, InsertUserOrganizationQuery, params.UserID, params.OrganizationID, params.Role)
	if err != nil {
		return UserOrganizationModel{}, err
	}
	return result, nil
}

// CreateUser

type createUserParams struct {
	Name           string
	Email          string
	OrganizationID int
}

const InsertUserQuery = `
	-- accounts.insertUserQuery
	INSERT INTO users 
	(name, email) VALUES 
	($1, $2)
	RETURNING 
		user_id, 
		name, 
		email, 
		created_at, 
		updated_at;
	`

func (r *repository) InsertUser(ctx context.Context, params createUserParams) (UserModel, error) {

	var userResult UserModel
	err := r.db.Query(ctx, &userResult, InsertUserQuery, params.Name, params.Email)
	if err != nil {
		return UserModel{}, err
	}

	return userResult, nil
}

// GetUser

type getUserParams struct {
	OrganizationID int
	UserID         int
}

const fetchUserQuery = `
	-- accounts.fetchUserQuery
	SELECT 
		user_id, 
		name, 
		email, 
		created_at, 
		updated_at 
	FROM users 
	WHERE user_id = $1
	AND EXISTS (
		SELECT 1 
		FROM user_organizations 
		WHERE user_id = $1
		AND organization_id = $2
		LIMIT 1
	);
	`

func (r *repository) FetchUser(ctx context.Context, params getUserParams) (UserModel, error) {

	var result UserModel
	err := r.db.Query(ctx, &result, fetchUserQuery, params.OrganizationID, params.UserID)
	if err != nil {
		return UserModel{}, err
	}
	return result, nil
}

// GetUserByID

type getUserByIDParams struct {
	UserID int
}

const fetchUserByIDQuery = `
	-- accounts.fetchUserByIDQuery
	SELECT
		user_id,
		name,
		email,
		password_hash,
		created_at,
		updated_at
	FROM users
	WHERE user_id = $1;
	`

func (r *repository) FetchUserByID(ctx context.Context, params getUserByIDParams) (UserModel, error) {
	var result UserModel
	err := r.db.Query(ctx, &result, fetchUserByIDQuery, params.UserID)
	if err != nil {
		return UserModel{}, err
	}
	return result, nil
}

// GetUserByEmail

type getUserByEmailParams struct {
	Email string
}

const FetchUserByEmailQuery = `
	-- accounts.fetchUserByEmailQuery
	SELECT
		user_id,
		name,
		email,
		password_hash,
		created_at,
		updated_at
	FROM users
	WHERE email = $1;
	`

func (r *repository) FetchUserByEmail(ctx context.Context, params getUserByEmailParams) (UserModel, error) {

	var result UserModel
	err := r.db.Query(ctx, &result, FetchUserByEmailQuery, params.Email)
	if err != nil {
		return UserModel{}, err
	}
	return result, nil
}

// GetUserOrganizations

type getOrganizationByUsersParams struct {
	UserID int
}

const FetchOrganizationsByUserQuery = `
	-- accounts.fetchOrganizationsByUserQuery
	SELECT
	    uo.organization_id,
		uo.user_role as user_role,
		uo.is_default,
		o.name,
		o.city,
		o.state,
		o.zip,
		o.country,
		o.latitude,
		o.longitude,
		COALESCE(rp.permissions, ARRAY[]::text[]) as user_permissions
	FROM user_organizations uo
	LEFT JOIN organizations o USING (organization_id)
	LEFT JOIN LATERAL (
		SELECT ARRAY_AGG(permission) AS permissions
		FROM role_permissions
		WHERE role_name = uo.user_role
	) rp ON true

	WHERE user_id = $1
	`

func (r *repository) FetchOrganizationsByUser(ctx context.Context, params getOrganizationByUsersParams) ([]OrganizationWithPermissionsModel, error) {
	var result []OrganizationWithPermissionsModel
	err := r.db.Query(ctx, &result, FetchOrganizationsByUserQuery, params.UserID)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetUsers

type getUsersParams struct {
	OrganizationID int
}

const fetchUsersQuery = `
	-- accounts.fetchUsersQuery
	SELECT user_id, 
	       name, 
		   email,
		   created_at,
		   updated_at
	FROM users 
	WHERE user_id IN (
		SELECT user_id 
		FROM user_organizations 
		WHERE organization_id = $1
	);
	`

func (r *repository) FetchUsers(ctx context.Context, params getUsersParams) ([]UserModel, error) {

	var result []UserModel
	err := r.db.Query(ctx, &result, fetchUsersQuery, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// UpdateUser

type updateUserParams struct {
	UserID int
	Name   *string
	Email  *string
}

const modifyUserQuery = `
	-- accounts.modifyUserQuery
	UPDATE users 
	SET name = COALESCE($2, name),
		email = COALESCE($3, email),
		updated_at = $4
	WHERE user_id = $1;
	`

func (r *repository) ModifyUser(ctx context.Context, params updateUserParams) (UserModel, error) {
	var result UserModel
	err := r.db.Query(ctx, &result, modifyUserQuery, params.UserID, params.Name, params.Email, time.Now())
	if err != nil {
		return UserModel{}, err
	}
	return result, nil
}

// GetOrganization

type getOrganizationParams struct {
	OrganizationID int
}

const fetchOrganizationQuery = `
	-- accounts.fetchOrganizationQuery
	SELECT organization_id, 
		name, 
		city, 
		state, 
		zip, 
		country, 
		latitude, 
		longitude 
	FROM organizations WHERE organization_id = $1;
	`

func (r *repository) FetchOrganization(ctx context.Context, params getOrganizationParams) (OrganizationModel, error) {
	var result OrganizationModel
	err := r.db.Query(ctx, &result, fetchOrganizationQuery, params.OrganizationID)
	if err != nil {
		return OrganizationModel{}, err
	}
	return result, nil
}

// ModifyUserPassword

type modifyUserPasswordParams struct {
	UserID       int
	PasswordHash string
}

const modifyUserPasswordQuery = `
	-- accounts.modifyUserPasswordQuery
	UPDATE users
	SET password_hash = $2,
		updated_at = $3
	WHERE user_id = $1;
	`

func (r *repository) ModifyUserPassword(ctx context.Context, params modifyUserPasswordParams) error {
	return r.db.Run(ctx, modifyUserPasswordQuery, params.UserID, params.PasswordHash, time.Now())
}

// FetchOrganizationMembers

type fetchOrganizationMembersParams struct {
	OrganizationID int
}

const fetchOrganizationMembersQuery = `
	-- accounts.fetchOrganizationMembersQuery
	SELECT
		u.user_id,
		u.name,
		u.email,
		uo.user_role,
		uo.is_default,
		uo.created_at
	FROM user_organizations uo
	JOIN users u ON u.user_id = uo.user_id
	WHERE uo.organization_id = $1
	ORDER BY uo.created_at ASC;
	`

func (r *repository) FetchOrganizationMembers(ctx context.Context, params fetchOrganizationMembersParams) ([]OrganizationMemberModel, error) {
	var result []OrganizationMemberModel
	err := r.db.Query(ctx, &result, fetchOrganizationMembersQuery, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// FetchUserOrganization

type fetchUserOrganizationParams struct {
	UserID         int
	OrganizationID int
}

const fetchUserOrganizationQuery = `
	-- accounts.fetchUserOrganizationQuery
	SELECT
		user_id,
		organization_id,
		user_role
	FROM user_organizations
	WHERE user_id = $1 AND organization_id = $2;
	`

func (r *repository) FetchUserOrganization(ctx context.Context, params fetchUserOrganizationParams) (UserOrganizationModel, error) {
	var result UserOrganizationModel
	err := r.db.Query(ctx, &result, fetchUserOrganizationQuery, params.UserID, params.OrganizationID)
	if err != nil {
		return UserOrganizationModel{}, err
	}
	return result, nil
}

// ModifyDefaultOrganization

type modifyDefaultOrganizationParams struct {
	UserID         int
	OrganizationID int
}

const modifyDefaultOrganizationQuery = `
	-- accounts.modifyDefaultOrganizationQuery
	WITH reset AS (
		UPDATE user_organizations
		SET is_default = FALSE
		WHERE user_id = $1 AND is_default = TRUE
	)
	UPDATE user_organizations
	SET is_default = TRUE
	WHERE user_id = $1 AND organization_id = $2;
	`

func (r *repository) ModifyDefaultOrganization(ctx context.Context, params modifyDefaultOrganizationParams) error {
	return r.db.Run(ctx, modifyDefaultOrganizationQuery, params.UserID, params.OrganizationID)
}

// InsertOrganizationInvite

type insertOrganizationInviteParams struct {
	OrganizationID  int
	Email           string
	Role            Role
	Token           string
	InvitedByUserID int
	ExpiresAt       time.Time
}

const insertOrganizationInviteQuery = `
	-- accounts.insertOrganizationInviteQuery
	INSERT INTO organization_invites
	(organization_id, email, role, token, invited_by_user_id, expires_at)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (organization_id, email) DO UPDATE SET
		role = EXCLUDED.role,
		token = EXCLUDED.token,
		invited_by_user_id = EXCLUDED.invited_by_user_id,
		expires_at = EXCLUDED.expires_at,
		accepted_at = NULL,
		created_at = CURRENT_TIMESTAMP
	RETURNING
		invite_id,
		organization_id,
		email,
		role,
		token,
		invited_by_user_id,
		created_at,
		expires_at,
		accepted_at;
	`

func (r *repository) InsertOrganizationInvite(ctx context.Context, params insertOrganizationInviteParams) (OrganizationInviteModel, error) {
	var result OrganizationInviteModel
	err := r.db.Query(ctx, &result, insertOrganizationInviteQuery,
		params.OrganizationID,
		params.Email,
		params.Role,
		params.Token,
		params.InvitedByUserID,
		params.ExpiresAt,
	)
	if err != nil {
		return OrganizationInviteModel{}, err
	}
	return result, nil
}

// FetchOrganizationInviteByToken

type fetchOrganizationInviteByTokenParams struct {
	Token string
}

const fetchOrganizationInviteByTokenQuery = `
	-- accounts.fetchOrganizationInviteByTokenQuery
	SELECT
		invite_id,
		organization_id,
		email,
		role,
		token,
		invited_by_user_id,
		created_at,
		expires_at,
		accepted_at
	FROM organization_invites
	WHERE token = $1;
	`

func (r *repository) FetchOrganizationInviteByToken(ctx context.Context, params fetchOrganizationInviteByTokenParams) (OrganizationInviteModel, error) {
	var result OrganizationInviteModel
	err := r.db.Query(ctx, &result, fetchOrganizationInviteByTokenQuery, params.Token)
	if err != nil {
		return OrganizationInviteModel{}, err
	}
	return result, nil
}

// FetchOrganizationInvitesByOrg

type fetchOrganizationInvitesByOrgParams struct {
	OrganizationID int
}

const fetchOrganizationInvitesByOrgQuery = `
	-- accounts.fetchOrganizationInvitesByOrgQuery
	SELECT
		invite_id,
		organization_id,
		email,
		role,
		token,
		invited_by_user_id,
		created_at,
		expires_at,
		accepted_at
	FROM organization_invites
	WHERE organization_id = $1
	  AND accepted_at IS NULL
	  AND expires_at > CURRENT_TIMESTAMP
	ORDER BY created_at DESC;
	`

func (r *repository) FetchOrganizationInvitesByOrg(ctx context.Context, params fetchOrganizationInvitesByOrgParams) ([]OrganizationInviteModel, error) {
	var result []OrganizationInviteModel
	err := r.db.Query(ctx, &result, fetchOrganizationInvitesByOrgQuery, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ModifyOrganizationInviteAccepted

type modifyOrganizationInviteAcceptedParams struct {
	InviteID int
}

const modifyOrganizationInviteAcceptedQuery = `
	-- accounts.modifyOrganizationInviteAcceptedQuery
	UPDATE organization_invites
	SET accepted_at = CURRENT_TIMESTAMP
	WHERE invite_id = $1;
	`

func (r *repository) ModifyOrganizationInviteAccepted(ctx context.Context, params modifyOrganizationInviteAcceptedParams) error {
	return r.db.Run(ctx, modifyOrganizationInviteAcceptedQuery, params.InviteID)
}

// DeleteOrganizationInvite

type deleteOrganizationInviteParams struct {
	InviteID int
}

const deleteOrganizationInviteQuery = `
	-- accounts.deleteOrganizationInviteQuery
	DELETE FROM organization_invites
	WHERE invite_id = $1;
	`

func (r *repository) DeleteOrganizationInvite(ctx context.Context, params deleteOrganizationInviteParams) error {
	return r.db.Run(ctx, deleteOrganizationInviteQuery, params.InviteID)
}
