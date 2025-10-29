package accounts

import (
	"context"
	"time"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/catrutech/celeiro/pkg/system"
)

type Repository interface {
	FetchUser(ctx context.Context, params getUserParams) (UserModel, error)
	FetchUsers(ctx context.Context, params getUsersParams) ([]UserModel, error)
	InsertUser(ctx context.Context, user createUserParams) (UserModel, error)
	ModifyUser(ctx context.Context, params updateUserParams) (UserModel, error)
	FetchOrganizationsByUser(ctx context.Context, params getOrganizationByUsersParams) ([]OrganizationWithPermissionsModel, error)
	InsertOrganization(ctx context.Context, params insertOrganizationParams) (OrganizationModel, error)
	InsertUserOrganization(ctx context.Context, params createUserOrganizationParams) (UserOrganizationModel, error)
	FetchUserByEmail(ctx context.Context, params getUserByEmailParams) (UserModel, error)
	FetchOrganization(ctx context.Context, params getOrganizationParams) (OrganizationModel, error)
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
