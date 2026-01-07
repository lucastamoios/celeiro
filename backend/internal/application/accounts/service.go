package accounts

import (
	"context"
	"database/sql"
	stderrors "errors"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/validators"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	pkgerrors "github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"
)

type Service interface {
	RegisterUser(ctx context.Context, params RegisterUserInput) (RegisterUserOutput, error)
	GetUser(ctx context.Context, params GetUserInput) (User, error)
	GetUsers(ctx context.Context, params GetUsersInput) ([]User, error)
	GetOrganization(ctx context.Context, params GetOrganizationInput) (Organization, error)
	UpdateOrganization(ctx context.Context, params UpdateOrganizationInput) (Organization, error)
	GetOrganizationsByUser(ctx context.Context, params GetOrganizationsByUserInput) ([]OrganizationWithPermissions, error)

	// Organization Members
	GetOrganizationMembers(ctx context.Context, params GetOrganizationMembersInput) ([]OrganizationMember, error)

	// Default Organization
	SetDefaultOrganization(ctx context.Context, params SetDefaultOrganizationInput) error

	// Organization Invites
	CreateOrganizationInvite(ctx context.Context, params CreateOrganizationInviteInput) (OrganizationInvite, error)
	AcceptOrganizationInvite(ctx context.Context, params AcceptOrganizationInviteInput) (Authentication, error)
	GetPendingInvites(ctx context.Context, params GetPendingInvitesInput) ([]OrganizationInvite, error)
	CancelOrganizationInvite(ctx context.Context, params CancelOrganizationInviteInput) error

	// Backoffice (System-wide)
	GetAllUsers(ctx context.Context) ([]SystemUser, error)
	CreateSystemInvite(ctx context.Context, params CreateSystemInviteInput) (SystemInvite, error)
	AcceptSystemInvite(ctx context.Context, params AcceptSystemInviteInput) (Authentication, error)
	GetPendingSystemInvites(ctx context.Context) ([]SystemInvite, error)

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
	frontendURL string
}

func New(
	repo Repository,
	transientDB transientdb.TransientDatabase,
	mailer mailer.Mailer,
	system *system.System,
	logger logging.Logger,
	db database.Database,
	cfg *config.Config,
) Service {
	return &service{
		Repository:  repo,
		transientDB: transientDB,
		mailer:      mailer,
		system:      system,
		db:          db,
		logger:      logger,
		frontendURL: cfg.FrontendURL,
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
		return User{}, pkgerrors.Wrap(err, "failed to get user")
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
		return pkgerrors.New("name is required")
	}
	if r.Email == "" {
		return pkgerrors.New("email is required")
	}
	if r.OrganizationName == "" {
		return pkgerrors.New("organization name is required")
	}
	if !validators.IsValidEmail(r.Email) {
		return pkgerrors.New("invalid email")
	}
	if !r.Role.IsValid() {
		return pkgerrors.New("invalid role")
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

// UpdateOrganization

type UpdateOrganizationInput struct {
	OrganizationID int
	Name           *string
}

func (s *service) UpdateOrganization(ctx context.Context, params UpdateOrganizationInput) (Organization, error) {
	organizationModel, err := s.Repository.ModifyOrganization(ctx, modifyOrganizationParams{
		OrganizationID: params.OrganizationID,
		Name:           params.Name,
	})
	if err != nil {
		return Organization{}, pkgerrors.Wrap(err, "failed to update organization")
	}
	return Organization{}.FromModel(organizationModel), nil
}

// GetUserOrganization

type GetOrganizationsByUserInput struct {
	UserID int
}

func (s *service) GetOrganizationsByUser(ctx context.Context, params GetOrganizationsByUserInput) ([]OrganizationWithPermissions, error) {
	userOrganizations, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
		UserID: params.UserID,
	})
	if err != nil && !stderrors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var result []OrganizationWithPermissions
	for _, organization := range userOrganizations {
		result = append(result, OrganizationWithPermissions{}.FromModel(organization))
	}

	return result, nil
}

// GetOrganizationMembers

type GetOrganizationMembersInput struct {
	OrganizationID int
}

func (s *service) GetOrganizationMembers(ctx context.Context, params GetOrganizationMembersInput) ([]OrganizationMember, error) {
	members, err := s.Repository.FetchOrganizationMembers(ctx, fetchOrganizationMembersParams{
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	return OrganizationMembers{}.FromModel(members), nil
}

// SetDefaultOrganization

type SetDefaultOrganizationInput struct {
	UserID         int
	OrganizationID int
}

func (s *service) SetDefaultOrganization(ctx context.Context, params SetDefaultOrganizationInput) error {
	// Verify user belongs to this organization
	_, err := s.Repository.FetchUserOrganization(ctx, fetchUserOrganizationParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		if stderrors.Is(err, sql.ErrNoRows) {
			return pkgerrors.New("user does not belong to this organization")
		}
		return err
	}

	return s.Repository.ModifyDefaultOrganization(ctx, modifyDefaultOrganizationParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
}

// CreateOrganizationInvite

type CreateOrganizationInviteInput struct {
	OrganizationID  int
	Email           string
	Role            Role
	InvitedByUserID int
}

func (s *service) CreateOrganizationInvite(ctx context.Context, params CreateOrganizationInviteInput) (OrganizationInvite, error) {
	// Validate role
	if !params.Role.IsValid() {
		return OrganizationInvite{}, pkgerrors.New("invalid role")
	}

	// Check if user is already a member
	existingUser, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: params.Email,
	})
	if err == nil {
		// User exists, check if already a member
		_, err := s.Repository.FetchUserOrganization(ctx, fetchUserOrganizationParams{
			UserID:         existingUser.UserID,
			OrganizationID: params.OrganizationID,
		})
		if err == nil {
			return OrganizationInvite{}, pkgerrors.New("user is already a member of this organization")
		}
		if !stderrors.Is(err, sql.ErrNoRows) {
			return OrganizationInvite{}, err
		}
	} else if !stderrors.Is(err, sql.ErrNoRows) {
		return OrganizationInvite{}, err
	}

	// Generate secure token
	token := s.system.SessionToken.Generate(32)

	// Insert invite with 7-day expiration (use UTC for consistent timezone handling)
	expiresAt := s.system.Time.Now().UTC().Add(7 * 24 * time.Hour)

	invite, err := s.Repository.InsertOrganizationInvite(ctx, insertOrganizationInviteParams{
		OrganizationID:  params.OrganizationID,
		Email:           params.Email,
		Role:            params.Role,
		Token:           token,
		InvitedByUserID: params.InvitedByUserID,
		ExpiresAt:       expiresAt,
	})
	if err != nil {
		return OrganizationInvite{}, pkgerrors.Wrap(err, "failed to create invite")
	}

	// Get organization name for email
	org, err := s.Repository.FetchOrganization(ctx, getOrganizationParams{
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		s.logger.Error(ctx, "Failed to fetch organization for invite email", "error", err)
		// Continue without sending email - invite is created
	} else {
		// Send invite email
		err = s.sendOrganizationInviteEmail(ctx, sendOrganizationInviteEmailInput{
			Email:            params.Email,
			Token:            token,
			OrganizationName: org.Name,
		})
		if err != nil {
			s.logger.Error(ctx, "Failed to send invite email", "error", err)
			// Don't fail the operation - invite is created
		}
	}

	return OrganizationInvite{}.FromModel(invite), nil
}

type sendOrganizationInviteEmailInput struct {
	Email            string
	Token            string
	OrganizationName string
}

func (s *service) sendOrganizationInviteEmail(ctx context.Context, params sendOrganizationInviteEmailInput) error {
	inviteURL := s.frontendURL + "/invite?token=" + params.Token

	return s.mailer.SendEmail(ctx, mailer.EmailTemplateMessage{
		To:       []string{params.Email},
		Subject:  "Convite para " + params.OrganizationName,
		Template: mailer.OrganizationInviteTemplate,
		Data: map[string]any{
			"OrganizationName": params.OrganizationName,
			"InviteURL":        inviteURL,
		},
	})
}

// AcceptOrganizationInvite

type AcceptOrganizationInviteInput struct {
	Token string
}

func (s *service) AcceptOrganizationInvite(ctx context.Context, params AcceptOrganizationInviteInput) (Authentication, error) {
	// Fetch invite by token
	invite, err := s.Repository.FetchOrganizationInviteByToken(ctx, fetchOrganizationInviteByTokenParams{
		Token: params.Token,
	})
	if err != nil {
		if stderrors.Is(err, sql.ErrNoRows) {
			return Authentication{}, pkgerrors.New("invalid or expired invite")
		}
		return Authentication{}, err
	}

	// Check if expired (use UTC for consistent timezone handling)
	if s.system.Time.Now().UTC().After(invite.ExpiresAt) {
		return Authentication{}, pkgerrors.New("invite has expired")
	}

	// Check if already accepted
	if invite.AcceptedAt.Valid {
		return Authentication{}, pkgerrors.New("invite has already been accepted")
	}

	var auth Authentication

	err = s.db.Tx(ctx, func(ctx context.Context) error {
		// Check if user exists
		user, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
			Email: invite.Email,
		})

		isNewUser := false
		if stderrors.Is(err, sql.ErrNoRows) {
			// Create new user
			isNewUser = true
			// Extract name from email (before @)
			name := invite.Email
			if atIdx := len(invite.Email); atIdx > 0 {
				for i, c := range invite.Email {
					if c == '@' {
						name = invite.Email[:i]
						break
					}
				}
			}

			user, err = s.Repository.InsertUser(ctx, createUserParams{
				Name:           name,
				Email:          invite.Email,
				OrganizationID: invite.OrganizationID,
			})
			if err != nil {
				return pkgerrors.Wrap(err, "failed to create user")
			}
		} else if err != nil {
			return err
		}

		// Check if already a member (shouldn't happen, but safety check)
		_, err = s.Repository.FetchUserOrganization(ctx, fetchUserOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: invite.OrganizationID,
		})
		if err == nil {
			return pkgerrors.New("user is already a member of this organization")
		}
		if !stderrors.Is(err, sql.ErrNoRows) {
			return err
		}

		// Create user organization entry
		_, err = s.Repository.InsertUserOrganization(ctx, createUserOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: invite.OrganizationID,
			Role:           invite.Role,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to add user to organization")
		}

		// Mark invite as accepted
		err = s.Repository.ModifyOrganizationInviteAccepted(ctx, modifyOrganizationInviteAcceptedParams{
			InviteID: invite.InviteID,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to mark invite as accepted")
		}

		// Get all user organizations for session
		organizations, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
			UserID: user.UserID,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to fetch user organizations")
		}

		var orgsWithPermissions []OrganizationWithPermissions
		for _, org := range organizations {
			orgsWithPermissions = append(orgsWithPermissions, OrganizationWithPermissions{}.FromModel(org))
		}

		// Create session
		userSession := SessionInfo{}.FromUserAndOrganizations(user, orgsWithPermissions)
		session, err := s.CreateSession(ctx, CreateSessionInput{
			Info: userSession,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to create session")
		}

		auth = Authentication{
			Session:   session,
			IsNewUser: isNewUser,
		}

		return nil
	})

	if err != nil {
		return Authentication{}, err
	}

	return auth, nil
}

// GetPendingInvites

type GetPendingInvitesInput struct {
	OrganizationID int
}

func (s *service) GetPendingInvites(ctx context.Context, params GetPendingInvitesInput) ([]OrganizationInvite, error) {
	invites, err := s.Repository.FetchOrganizationInvitesByOrg(ctx, fetchOrganizationInvitesByOrgParams{
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	return OrganizationInvites{}.FromModel(invites), nil
}

// CancelOrganizationInvite

type CancelOrganizationInviteInput struct {
	InviteID       int
	OrganizationID int // For authorization check
}

func (s *service) CancelOrganizationInvite(ctx context.Context, params CancelOrganizationInviteInput) error {
	return s.Repository.DeleteOrganizationInvite(ctx, deleteOrganizationInviteParams{
		InviteID: params.InviteID,
	})
}

// =====================
// Backoffice (System-wide)
// =====================

// GetAllUsers returns all users in the system with their organizations
func (s *service) GetAllUsers(ctx context.Context) ([]SystemUser, error) {
	users, err := s.Repository.FetchAllUsers(ctx)
	if err != nil {
		return nil, pkgerrors.Wrap(err, "failed to get all users")
	}

	return SystemUsers{}.FromModel(users), nil
}

// CreateSystemInvite

type CreateSystemInviteInput struct {
	Email            string
	OrganizationName string
	InvitedByUserID  int
}

func (s *service) CreateSystemInvite(ctx context.Context, params CreateSystemInviteInput) (SystemInvite, error) {
	// Check if user already exists
	_, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{Email: params.Email})
	if err == nil {
		return SystemInvite{}, errors.ErrUserAlreadyExists
	}
	if !stderrors.Is(err, sql.ErrNoRows) {
		return SystemInvite{}, pkgerrors.Wrap(err, "failed to check existing user")
	}

	// Generate invite token
	token := s.system.SessionToken.Generate(64)

	// Set expiration (7 days) - use UTC for consistent timezone handling
	expiresAt := s.system.Time.Now().UTC().Add(7 * 24 * time.Hour)

	invite, err := s.Repository.InsertSystemInvite(ctx, insertSystemInviteParams{
		Email:            params.Email,
		OrganizationName: params.OrganizationName,
		Token:            token,
		InvitedByUserID:  params.InvitedByUserID,
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		return SystemInvite{}, pkgerrors.Wrap(err, "failed to create system invite")
	}

	// Send invite email using organization invite template (same format)
	err = s.sendOrganizationInviteEmail(ctx, sendOrganizationInviteEmailInput{
		Email:            params.Email,
		Token:            invite.Token,
		OrganizationName: params.OrganizationName,
	})
	if err != nil {
		s.logger.Error(ctx, "Failed to send system invite email", "email", params.Email, "error", err)
		// Don't fail the request, invite is created
	}

	return SystemInvite{}.FromModel(invite), nil
}

// AcceptSystemInvite

type AcceptSystemInviteInput struct {
	Token string
}

func (s *service) AcceptSystemInvite(ctx context.Context, params AcceptSystemInviteInput) (Authentication, error) {
	var auth Authentication

	err := s.db.Tx(ctx, func(ctx context.Context) error {
		// Get invite
		invite, err := s.Repository.FetchSystemInviteByToken(ctx, fetchSystemInviteByTokenParams{
			Token: params.Token,
		})
		if err != nil {
			if stderrors.Is(err, sql.ErrNoRows) {
				return errors.ErrInviteNotFound
			}
			return pkgerrors.Wrap(err, "failed to get system invite")
		}

		// Check if expired (use UTC for consistent timezone handling)
		if s.system.Time.Now().UTC().After(invite.ExpiresAt) {
			return errors.ErrInviteExpired
		}

		// Check if already accepted
		if invite.AcceptedAt.Valid {
			return errors.ErrInviteAlreadyAccepted
		}

		// Extract name from email (before @)
		nameFromEmail := invite.Email
		for i, c := range invite.Email {
			if c == '@' {
				nameFromEmail = invite.Email[:i]
				break
			}
		}

		user, err := s.Repository.InsertUser(ctx, createUserParams{
			Email: invite.Email,
			Name:  nameFromEmail,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to create user")
		}

		// Create the organization
		org, err := s.Repository.InsertOrganization(ctx, insertOrganizationParams{
			Name: invite.OrganizationName,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to create organization")
		}

		// Add user to organization as admin
		_, err = s.Repository.InsertUserOrganization(ctx, createUserOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: org.OrganizationID,
			Role:           RoleAdmin,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to add user to organization")
		}

		// Set as default organization
		err = s.Repository.ModifyDefaultOrganization(ctx, modifyDefaultOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: org.OrganizationID,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to set default organization")
		}

		// Mark invite as accepted
		err = s.Repository.ModifySystemInviteAccepted(ctx, modifySystemInviteAcceptedParams{
			InviteID: invite.InviteID,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to mark invite as accepted")
		}

		// Get organizations with permissions
		orgsWithPermissions, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
			UserID: user.UserID,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to get user organizations")
		}

		// Create session
		userSession := SessionInfo{}.FromUserAndOrganizations(user, OrganizationsWithPermission{}.FromModel(orgsWithPermissions))
		session, err := s.CreateSession(ctx, CreateSessionInput{
			Info: userSession,
		})
		if err != nil {
			return pkgerrors.Wrap(err, "failed to create session")
		}

		auth = Authentication{
			Session:   session,
			IsNewUser: true,
		}

		return nil
	})

	if err != nil {
		return Authentication{}, err
	}

	return auth, nil
}

// GetPendingSystemInvites

func (s *service) GetPendingSystemInvites(ctx context.Context) ([]SystemInvite, error) {
	invites, err := s.Repository.FetchPendingSystemInvites(ctx)
	if err != nil {
		return nil, pkgerrors.Wrap(err, "failed to get pending system invites")
	}

	result := make([]SystemInvite, len(invites))
	for i, invite := range invites {
		result[i] = SystemInvite{}.FromModel(invite)
	}

	return result, nil
}
