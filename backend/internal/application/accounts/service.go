package accounts

import (
	"context"
	"database/sql"

	"github.com/catrutech/celeiro/internal/web/validators"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"
)

type Service interface {
	RegisterUser(ctx context.Context, params RegisterUserInput) (RegisterUserOutput, error)
	GetUser(ctx context.Context, params GetUserInput) (User, error)
	GetUsers(ctx context.Context, params GetUsersInput) ([]User, error)
	GetOrganization(ctx context.Context, params GetOrganizationInput) (Organization, error)
	GetOrganizationsByUser(ctx context.Context, params GetOrganizationsByUserInput) ([]OrganizationWithPermissions, error)

	AccountsSession
	AccountsAuth
}

type service struct {
	Repository  Repository
	transientDB transientdb.TransientDatabase
	mailer      mailer.Mailer
	system      *system.System
	logger      logging.Logger
	db          database.Database
}

func New(
	repo Repository,
	transientDB transientdb.TransientDatabase,
	mailer mailer.Mailer,
	system *system.System,
	logger logging.Logger,
	db database.Database,
) Service {
	return &service{
		Repository:  repo,
		transientDB: transientDB,
		mailer:      mailer,
		system:      system,
		db:          db,
		logger:      logger,
	}
}

// GetUser

type GetUserInput struct {
	OrganizationID int
	UserID         int
}

func (s *service) GetUser(ctx context.Context, params GetUserInput) (User, error) {
	user, err := s.Repository.FetchUser(ctx, getUserParams{
		OrganizationID: params.OrganizationID,
		UserID:         params.UserID,
	})
	if err != nil {
		return User{}, errors.Wrap(err, "failed to get user")
	}

	return User{}.FromModel(&user), nil
}

// GetUsers

type GetUsersInput struct {
	OrganizationID int
}

func (s *service) GetUsers(ctx context.Context, params GetUsersInput) ([]User, error) {
	users, err := s.Repository.FetchUsers(ctx, getUsersParams{
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	var result []User
	for _, user := range users {
		result = append(result, User{}.FromModel(&user))
	}

	return result, nil
}

// RegisterUser

type RegisterUserInput struct {
	Name             string
	Email            string
	OrganizationName string
	OrganizationID   int
	Role             Role
}

func (r *RegisterUserInput) Validate() error {
	if r.Name == "" {
		return errors.New("name is required")
	}
	if r.Email == "" {
		return errors.New("email is required")
	}
	if r.OrganizationName == "" {
		return errors.New("organization name is required")
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.New("invalid email")
	}
	if !r.Role.IsValid() {
		return errors.New("invalid role")
	}
	return nil
}

type RegisterUserOutput struct {
	User         User
	Organization OrganizationWithPermissions
}

func (s *service) RegisterUser(ctx context.Context, params RegisterUserInput) (RegisterUserOutput, error) {
	if err := params.Validate(); err != nil {
		return RegisterUserOutput{}, err
	}

	var output RegisterUserOutput

	err := s.db.Tx(ctx, func(ctx context.Context) error {
		var organizationModel OrganizationModel
		var err error

		if params.OrganizationID != 0 {
			organizationModel, err = s.Repository.FetchOrganization(ctx, getOrganizationParams{
				OrganizationID: params.OrganizationID,
			})
			if err != nil {
				s.logger.Error(ctx, "Failed to fetch organization", "error", err)
				return err
			}
		} else {
			organizationModel, err = s.Repository.InsertOrganization(ctx, insertOrganizationParams{
				Name: params.OrganizationName,
			})
			if err != nil {
				s.logger.Error(ctx, "Failed to insert organization", "error", err)
				return err
			}
		}

		userModel, err := s.Repository.InsertUser(ctx, createUserParams{
			Name:           params.Name,
			Email:          params.Email,
			OrganizationID: organizationModel.OrganizationID,
		})
		if err != nil {
			s.logger.Error(ctx, "Failed to insert user", "error", err)
			return err
		}

		userOrganization, err := s.Repository.InsertUserOrganization(ctx, createUserOrganizationParams{
			UserID:         userModel.UserID,
			OrganizationID: organizationModel.OrganizationID,
			Role:           params.Role,
		})
		if err != nil {
			s.logger.Error(ctx, "Failed to insert user organization", "error", err)
			return err
		}

		user := User{}.FromModel(&userModel)
		organization := OrganizationWithPermissions{}.FromModel(OrganizationWithPermissionsModel{
			OrganizationModel: organizationModel,
			UserRole:          userOrganization.UserRole,
		})
		output = RegisterUserOutput{
			User:         user,
			Organization: organization,
		}

		return nil
	})

	return output, err
}

// GetOrganization

type GetOrganizationInput struct {
	OrganizationID int
}

func (s *service) GetOrganization(ctx context.Context, params GetOrganizationInput) (Organization, error) {
	organizationModel, err := s.Repository.FetchOrganization(ctx, getOrganizationParams{
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return Organization{}, err
	}
	organization := Organization{}.FromModel(organizationModel)
	return organization, nil
}

// GetUserOrganization

type GetOrganizationsByUserInput struct {
	UserID int
}

func (s *service) GetOrganizationsByUser(ctx context.Context, params GetOrganizationsByUserInput) ([]OrganizationWithPermissions, error) {
	userOrganizations, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
		UserID: params.UserID,
	})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var result []OrganizationWithPermissions
	for _, organization := range userOrganizations {
		result = append(result, OrganizationWithPermissions{}.FromModel(organization))
	}

	return result, nil
}
