package accounts

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"time"

	internalerrors "github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/validators"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/mailer"
	"golang.org/x/crypto/bcrypt"
)

type AccountsAuth interface {
	Register(ctx context.Context, input SelfRegisterInput) (Authentication, error)
	AuthenticateWithMagicCode(ctx context.Context, input AuthenticateWithMagicCodeInput) (Authentication, error)
	RequestMagicLinkViaEmail(ctx context.Context, input RequestMagicLinkViaEmailInput) (RequestMagicLinkViaEmailOutput, error)
	AuthenticateWithGoogle(ctx context.Context, input AuthenticateWithGoogleInput) (Authentication, error)
	AuthenticateWithPassword(ctx context.Context, input AuthenticateWithPasswordInput) (Authentication, error)
	SetPassword(ctx context.Context, input SetPasswordInput) error
	RequestPasswordReset(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error

	generateMagicLinkCode(ctx context.Context, input generateMagicLinkCodeInput) (string, error)
	sendMagicLinkEmail(ctx context.Context, input sendMagicLinkEmailInput) error
	validateMagicLinkCode(ctx context.Context, input validateMagicLinkCodeInput) error
	getMagicCode(ctx context.Context, input getMagicCodeInput) (MagicCode, error)
	deleteMagicCode(ctx context.Context, input deleteMagicCodeInput) error
	getMagicCodeKey(email string) string
	generateCode() string
	getPasswordResetKey(token string) string
}

// AuthenticateWithMagicCode

type AuthenticateWithMagicCodeInput struct {
	Email string
	Code  string
}

func (s *service) AuthenticateWithMagicCode(ctx context.Context, params AuthenticateWithMagicCodeInput) (Authentication, error) {
	if err := s.validateMagicLinkCode(ctx, validateMagicLinkCodeInput{
		Email: params.Email,
		Code:  params.Code,
	}); err != nil {
		return Authentication{}, err
	}

	// Fetch user - auto-registration is disabled, user must exist
	userModel, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: params.Email,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Authentication{}, internalerrors.ErrInvalidCredentials
		}
		return Authentication{}, err
	}

	user := User{}.FromModel(&userModel)
	organizations, err := s.GetOrganizationsByUser(ctx, GetOrganizationsByUserInput{
		UserID: user.UserID,
	})
	if err != nil {
		return Authentication{}, err
	}

	userSession := SessionInfo{}.FromUserAndOrganizations(userModel, organizations)

	session, err := s.CreateSession(ctx, CreateSessionInput{
		Info: userSession,
	})
	if err != nil {
		return Authentication{}, err
	}

	return Authentication{
		Session:   session,
		IsNewUser: false, // Auto-registration disabled
	}, nil
}

// TODO: To re-enable auto-registration for magic link, restore the original
// AuthenticateWithMagicCode that creates new users when they don't exist.

// Register creates a new user account with password (public self-registration).
func (s *service) Register(ctx context.Context, params SelfRegisterInput) (Authentication, error) {
	if params.Name == "" {
		return Authentication{}, errors.New("name is required")
	}
	if params.Email == "" || !validators.IsValidEmail(params.Email) {
		return Authentication{}, errors.New("valid email is required")
	}
	if len(params.Password) < MinPasswordLength {
		return Authentication{}, fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}

	if err := s.verifyRecaptcha(params.RecaptchaToken); err != nil {
		return Authentication{}, internalerrors.ErrRecaptchaFailed
	}

	// Check if user already exists
	_, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{Email: params.Email})
	if err == nil {
		return Authentication{}, internalerrors.ErrUserAlreadyExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Authentication{}, err
	}

	hashedPassword, err := hashPassword(params.Password)
	if err != nil {
		return Authentication{}, errors.Wrap(err, "failed to hash password")
	}

	var auth Authentication
	err = s.db.Tx(ctx, func(ctx context.Context) error {
		user, err := s.Repository.InsertUser(ctx, createUserParams{
			Name:  params.Name,
			Email: params.Email,
		})
		if err != nil {
			return errors.Wrap(err, "failed to create user")
		}

		if err := s.Repository.ModifyUserPassword(ctx, modifyUserPasswordParams{
			UserID:       user.UserID,
			PasswordHash: hashedPassword,
		}); err != nil {
			return errors.Wrap(err, "failed to set password")
		}

		org, err := s.Repository.InsertOrganization(ctx, insertOrganizationParams{
			Name: "Finanças de " + params.Name,
		})
		if err != nil {
			return errors.Wrap(err, "failed to create organization")
		}

		_, err = s.Repository.InsertUserOrganization(ctx, createUserOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: org.OrganizationID,
			Role:           RoleAdmin,
		})
		if err != nil {
			return errors.Wrap(err, "failed to add user to organization")
		}

		if err := s.Repository.ModifyDefaultOrganization(ctx, modifyDefaultOrganizationParams{
			UserID:         user.UserID,
			OrganizationID: org.OrganizationID,
		}); err != nil {
			return errors.Wrap(err, "failed to set default organization")
		}

		orgsWithPermissions, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
			UserID: user.UserID,
		})
		if err != nil {
			return errors.Wrap(err, "failed to get user organizations")
		}

		userSession := SessionInfo{}.FromUserAndOrganizations(user, OrganizationsWithPermission{}.FromModel(orgsWithPermissions))
		session, err := s.CreateSession(ctx, CreateSessionInput{Info: userSession})
		if err != nil {
			return errors.Wrap(err, "failed to create session")
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

// RequestMagicLinkViaEmail

type RequestMagicLinkViaEmailInput struct {
	Email           string
	CheckUserExists bool
}

type RequestMagicLinkViaEmailOutput struct {
	Code string
}

func (a *service) RequestMagicLinkViaEmail(ctx context.Context, input RequestMagicLinkViaEmailInput) (RequestMagicLinkViaEmailOutput, error) {
	code, err := a.generateMagicLinkCode(ctx, generateMagicLinkCodeInput{
		Email:           input.Email,
		CheckUserExists: input.CheckUserExists,
	})
	if err != nil {
		return RequestMagicLinkViaEmailOutput{}, err
	}


	if err := a.sendMagicLinkEmail(ctx, sendMagicLinkEmailInput{
		Email: input.Email,
		Code:  code,
	}); err != nil {
		return RequestMagicLinkViaEmailOutput{}, err
	}

	return RequestMagicLinkViaEmailOutput{
		Code: code,
	}, nil
}

// generateMagicLinkCode

type generateMagicLinkCodeInput struct {
	Email           string
	CheckUserExists bool
}

func (a *service) generateMagicLinkCode(ctx context.Context, input generateMagicLinkCodeInput) (string, error) {
	if a.transientDB == nil {
		return "", errors.New("transient database not available")
	}

	if input.CheckUserExists {
		_, err := a.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
			Email: input.Email,
		})
		if err != nil {
			return "", errors.Wrap(err, "failed to get user by email")
		}
	}

	code := a.generateCode()
	expiration := 10 * time.Minute

	magicCode := MagicCode{
		Code:      code,
		Email:     input.Email,
		ExpiresAt: time.Now().Add(expiration),
	}

	codeJSON, err := json.Marshal(magicCode)
	if err != nil {
		return "", errors.Wrap(err, "failed to generate magic code")
	}

	key := a.getMagicCodeKey(input.Email)
	if err := a.transientDB.SetWithExpiration(ctx, key, string(codeJSON), expiration); err != nil {
		return "", errors.Wrap(err, "failed to store magic code")
	}

	return code, nil
}

// sendMagicLinkEmail

type sendMagicLinkEmailInput struct {
	Email string
	Code  string
}

func (a *service) sendMagicLinkEmail(ctx context.Context, input sendMagicLinkEmailInput) error {
	if a.mailer == nil {
		return nil
	}

	// Build the magic link URL with email and code as query params
	loginURL := fmt.Sprintf("%s?email=%s&code=%s", a.frontendURL, input.Email, input.Code)

	message := mailer.EmailTemplateMessage{
		To:       []string{input.Email},
		Subject:  "Seu Código de Acesso - Celeiro",
		Template: mailer.TemplateAuthCode,
		Data: map[string]any{
			"Code":     input.Code,
			"LoginURL": loginURL,
		},
	}

	return a.mailer.SendEmail(ctx, message)
}

// validateMagicLinkCode

type validateMagicLinkCodeInput struct {
	Email string
	Code  string
}

func (r *validateMagicLinkCodeInput) Validate() error {
	if r.Email == "" {
		return errors.New("email is required")
	}
	if r.Code == "" {
		return errors.New("code is required")
	}
	if !validators.IsValidEmail(r.Email) {
		return errors.New("email is invalid")
	}
	if len(r.Code) != 4 {
		return errors.New("code must be 4 digits")
	}
	return nil
}

func (a *service) validateMagicLinkCode(ctx context.Context, input validateMagicLinkCodeInput) error {
	if err := input.Validate(); err != nil {
		return internalerrors.NewErrActivationFailed("magic code validation failed")
	}

	if a.transientDB == nil {
		return errors.New("transient database not available")
	}

	magicCode, err := a.getMagicCode(ctx, getMagicCodeInput{
		Email: input.Email,
	})
	if err != nil {
		if err.Error() == "code has expired" {
			return errors.New("code has expired")
		}
		return internalerrors.NewErrActivationFailed("magic code validation failed")
	}

	if magicCode.Code != input.Code {
		return internalerrors.ErrInvalidCode
	}

	if err := a.deleteMagicCode(ctx, deleteMagicCodeInput{
		Email: input.Email,
	}); err != nil {
		return errors.Wrap(err, "failed to delete magic code")
	}

	return nil
}

// getMagicCode

type getMagicCodeInput struct {
	Email string
}

func (a *service) getMagicCode(ctx context.Context, params getMagicCodeInput) (MagicCode, error) {
	key := a.getMagicCodeKey(params.Email)
	codeJSON, err := a.transientDB.Get(ctx, key)
	if err != nil {
		return MagicCode{}, err
	}

	var magicCode MagicCode
	if err := json.Unmarshal([]byte(codeJSON), &magicCode); err != nil {
		return MagicCode{}, errors.Wrap(err, "failed to unmarshal magic code")
	}

	if time.Now().After(magicCode.ExpiresAt) {
		a.deleteMagicCode(ctx, deleteMagicCodeInput{
			Email: params.Email,
		})
		return MagicCode{}, errors.New("code has expired") // TODO: better error
	}

	return magicCode, nil
}

// deleteMagicCode

type deleteMagicCodeInput struct {
	Email string
}

func (a *service) deleteMagicCode(ctx context.Context, params deleteMagicCodeInput) error {
	key := a.getMagicCodeKey(params.Email)
	return a.transientDB.Delete(ctx, key)
}

// getMagicCodeKey

func (a *service) getMagicCodeKey(email string) string {
	return fmt.Sprintf("magic_code:%s", email)
}

// generateCode

func (a *service) generateCode() string {
	return fmt.Sprintf("%04d", rand.Intn(10000))
}

// AuthenticateWithGoogle

type AuthenticateWithGoogleInput struct {
	AccessToken    string
	RecaptchaToken string
}

type GoogleTokenInfo struct {
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Error         string `json:"error"`
	ErrorDesc     string `json:"error_description"`
}

func (s *service) AuthenticateWithGoogle(ctx context.Context, params AuthenticateWithGoogleInput) (Authentication, error) {
	if params.AccessToken == "" {
		return Authentication{}, errors.New("access token is required")
	}

	tokenInfo, err := s.validateGoogleToken(ctx, params.AccessToken)
	if err != nil {
		return Authentication{}, errors.Wrap(err, "failed to validate Google token")
	}

	if tokenInfo.Email == "" {
		return Authentication{}, errors.New("could not get email from Google token")
	}

	userModel, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: tokenInfo.Email,
	})

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return Authentication{}, err
	}

	isNewUser := errors.Is(err, sql.ErrNoRows)

	if isNewUser {
		// Verify reCAPTCHA only for new user registration
		if err := s.verifyRecaptcha(params.RecaptchaToken); err != nil {
			return Authentication{}, internalerrors.ErrRecaptchaFailed
		}

		var auth Authentication
		txErr := s.db.Tx(ctx, func(ctx context.Context) error {
			name := tokenInfo.Name
			if name == "" {
				name = tokenInfo.Email
			}

			newUser, err := s.Repository.InsertUser(ctx, createUserParams{
				Name:  name,
				Email: tokenInfo.Email,
			})
			if err != nil {
				return errors.Wrap(err, "failed to create user")
			}

			org, err := s.Repository.InsertOrganization(ctx, insertOrganizationParams{
				Name: "Finanças de " + name,
			})
			if err != nil {
				return errors.Wrap(err, "failed to create organization")
			}

			_, err = s.Repository.InsertUserOrganization(ctx, createUserOrganizationParams{
				UserID:         newUser.UserID,
				OrganizationID: org.OrganizationID,
				Role:           RoleAdmin,
			})
			if err != nil {
				return errors.Wrap(err, "failed to add user to organization")
			}

			if err := s.Repository.ModifyDefaultOrganization(ctx, modifyDefaultOrganizationParams{
				UserID:         newUser.UserID,
				OrganizationID: org.OrganizationID,
			}); err != nil {
				return errors.Wrap(err, "failed to set default organization")
			}

			orgsWithPermissions, err := s.Repository.FetchOrganizationsByUser(ctx, getOrganizationByUsersParams{
				UserID: newUser.UserID,
			})
			if err != nil {
				return errors.Wrap(err, "failed to get user organizations")
			}

			userSession := SessionInfo{}.FromUserAndOrganizations(newUser, OrganizationsWithPermission{}.FromModel(orgsWithPermissions))
			session, err := s.CreateSession(ctx, CreateSessionInput{Info: userSession})
			if err != nil {
				return errors.Wrap(err, "failed to create session")
			}

			auth = Authentication{Session: session, IsNewUser: true}
			return nil
		})
		if txErr != nil {
			return Authentication{}, txErr
		}
		return auth, nil
	}

	// Existing user — normal login
	user := User{}.FromModel(&userModel)
	organizations, err := s.GetOrganizationsByUser(ctx, GetOrganizationsByUserInput{
		UserID: user.UserID,
	})
	if err != nil {
		return Authentication{}, err
	}

	userSession := SessionInfo{}.FromUserAndOrganizations(userModel, organizations)
	session, err := s.CreateSession(ctx, CreateSessionInput{Info: userSession})
	if err != nil {
		return Authentication{}, err
	}

	return Authentication{
		Session:   session,
		IsNewUser: false,
	}, nil
}

func (s *service) validateGoogleToken(ctx context.Context, accessToken string) (GoogleTokenInfo, error) {
	// Use Google's userinfo endpoint to validate the token and get user info
	req, err := http.NewRequestWithContext(ctx, "GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return GoogleTokenInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return GoogleTokenInfo{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return GoogleTokenInfo{}, err
	}

	var tokenInfo GoogleTokenInfo
	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		return GoogleTokenInfo{}, err
	}

	if tokenInfo.Error != "" {
		return GoogleTokenInfo{}, fmt.Errorf("google auth error: %s - %s", tokenInfo.Error, tokenInfo.ErrorDesc)
	}

	return tokenInfo, nil
}

// AuthenticateWithPassword

type AuthenticateWithPasswordInput struct {
	Email    string
	Password string
}

const MinPasswordLength = 8

func (s *service) AuthenticateWithPassword(ctx context.Context, params AuthenticateWithPasswordInput) (Authentication, error) {
	if params.Email == "" {
		return Authentication{}, errors.New("email is required")
	}
	if params.Password == "" {
		return Authentication{}, errors.New("password is required")
	}

	// Fetch user by email
	userModel, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: params.Email,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Authentication{}, internalerrors.ErrInvalidCredentials
		}
		return Authentication{}, err
	}

	// Check if user has a password set
	if !userModel.PasswordHash.Valid || userModel.PasswordHash.String == "" {
		return Authentication{}, internalerrors.ErrInvalidCredentials
	}

	// Verify password
	if !checkPassword(params.Password, userModel.PasswordHash.String) {
		return Authentication{}, internalerrors.ErrInvalidCredentials
	}

	// Get user organizations
	user := User{}.FromModel(&userModel)
	organizations, err := s.GetOrganizationsByUser(ctx, GetOrganizationsByUserInput{
		UserID: user.UserID,
	})
	if err != nil {
		return Authentication{}, err
	}

	// Create session
	userSession := SessionInfo{}.FromUserAndOrganizations(userModel, organizations)
	session, err := s.CreateSession(ctx, CreateSessionInput{
		Info: userSession,
	})
	if err != nil {
		return Authentication{}, err
	}

	return Authentication{
		Session:   session,
		IsNewUser: false,
	}, nil
}

// SetPassword

type SetPasswordInput struct {
	UserID      int
	OldPassword string // Empty if setting for first time
	NewPassword string
}

func (s *service) SetPassword(ctx context.Context, params SetPasswordInput) error {
	if params.NewPassword == "" {
		return errors.New("new password is required")
	}
	if len(params.NewPassword) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}

	// Fetch user to check current password state
	userModel, err := s.Repository.FetchUserByID(ctx, getUserByIDParams{
		UserID: params.UserID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to fetch user")
	}

	// If user already has a password, verify the old password
	if userModel.PasswordHash.Valid && userModel.PasswordHash.String != "" {
		if params.OldPassword == "" {
			return errors.New("current password is required")
		}
		if !checkPassword(params.OldPassword, userModel.PasswordHash.String) {
			return internalerrors.ErrInvalidCredentials
		}
	}

	// Hash the new password
	hashedPassword, err := hashPassword(params.NewPassword)
	if err != nil {
		return errors.Wrap(err, "failed to hash password")
	}

	// Update the password
	if err := s.Repository.ModifyUserPassword(ctx, modifyUserPasswordParams{
		UserID:       params.UserID,
		PasswordHash: hashedPassword,
	}); err != nil {
		return errors.Wrap(err, "failed to update password")
	}

	return nil
}

// Password hashing helpers

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// RequestPasswordReset

// RequestPasswordReset generates a password reset token, stores it in Redis, and sends a reset email.
// Always returns nil to prevent email enumeration — callers should always respond with 200.
func (a *service) RequestPasswordReset(ctx context.Context, email string) error {
	if a.transientDB == nil {
		return nil
	}

	// Generate a secure random token using crypto/rand (via SessionToken generator)
	token := a.system.SessionToken.Generate(32)

	ttl := 24 * time.Hour
	key := a.getPasswordResetKey(token)
	if err := a.transientDB.SetWithExpiration(ctx, key, email, ttl); err != nil {
		// Log but don't surface the error to avoid timing side-channels
		return nil
	}

	if a.mailer == nil {
		return nil
	}

	resetURL := fmt.Sprintf("%s/?reset-token=%s", a.frontendURL, url.QueryEscape(token))
	msg := mailer.EmailTemplateMessage{
		To:       []string{email},
		Subject:  "Redefinição de senha - Celeiro",
		Template: mailer.TemplatePasswordReset,
		Data: map[string]any{
			"ResetURL": resetURL,
		},
	}

	// Best-effort: send email, ignore error to avoid enumeration
	a.mailer.SendEmail(ctx, msg) //nolint:errcheck
	return nil
}

// ResetPassword

// ResetPassword validates a password reset token and updates the user's password.
func (a *service) ResetPassword(ctx context.Context, token, newPassword string) error {
	if len(newPassword) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}

	if a.transientDB == nil {
		return errors.New("transient database not available")
	}

	key := a.getPasswordResetKey(token)
	email, err := a.transientDB.Get(ctx, key)
	if err != nil {
		return internalerrors.ErrInvalidToken
	}

	userModel, err := a.Repository.FetchUserByEmail(ctx, getUserByEmailParams{Email: email})
	if err != nil {
		return internalerrors.ErrInvalidToken
	}

	hashedPassword, err := hashPassword(newPassword)
	if err != nil {
		return errors.Wrap(err, "failed to hash password")
	}

	if err := a.Repository.ModifyUserPassword(ctx, modifyUserPasswordParams{
		UserID:       userModel.UserID,
		PasswordHash: hashedPassword,
	}); err != nil {
		return errors.Wrap(err, "failed to update password")
	}

	// Single-use: delete token immediately after successful reset
	a.transientDB.Delete(ctx, key) //nolint:errcheck
	return nil
}

// getPasswordResetKey returns the Redis key for a password reset token.
func (a *service) getPasswordResetKey(token string) string {
	return fmt.Sprintf("password_reset:%s", token)
}
