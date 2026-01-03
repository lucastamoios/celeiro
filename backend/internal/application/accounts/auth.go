package accounts

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"

	internalerrors "github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/validators"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/mailer"
)

type AccountsAuth interface {
	AuthenticateWithMagicCode(ctx context.Context, input AuthenticateWithMagicCodeInput) (Authentication, error)
	RequestMagicLinkViaEmail(ctx context.Context, input RequestMagicLinkViaEmailInput) (RequestMagicLinkViaEmailOutput, error)
	AuthenticateWithGoogle(ctx context.Context, input AuthenticateWithGoogleInput) (Authentication, error)

	generateMagicLinkCode(ctx context.Context, input generateMagicLinkCodeInput) (string, error)
	sendMagicLinkEmail(ctx context.Context, input sendMagicLinkEmailInput) error
	validateMagicLinkCode(ctx context.Context, input validateMagicLinkCodeInput) error
	getMagicCode(ctx context.Context, input getMagicCodeInput) (MagicCode, error)
	deleteMagicCode(ctx context.Context, input deleteMagicCodeInput) error
	getMagicCodeKey(email string) string
	generateCode() string
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

	var user User
	var organizations []OrganizationWithPermissions
	var userModel UserModel
	isNewUser := false
	fetchedUserModel, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: params.Email,
	})
	if err != nil {
		// User does not exist, create new user
		if !errors.Is(err, sql.ErrNoRows) {
			return Authentication{}, err
		}

		name := params.Email
		if atIndex := strings.Index(params.Email, "@"); atIndex > 0 {
			name = params.Email[:atIndex]
		}

		registerOutput, createErr := s.RegisterUser(ctx, RegisterUserInput{
			Name:             name,
			Email:            params.Email,
			OrganizationName: params.Email,
			Role:             RoleRegularManager,
		})
		if createErr != nil {
			return Authentication{}, createErr
		}

		isNewUser = true
		user = registerOutput.User
		organizations = []OrganizationWithPermissions{registerOutput.Organization}
		// Convert User to UserModel for session creation
		userModel = UserModel{
			UserID:    user.UserID,
			Name:      user.Name,
			Email:     user.Email,
			Phone:     user.Phone,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
			Address:   user.Address,
			City:      user.City,
			State:     user.State,
			Zip:       user.Zip,
			Country:   user.Country,
			Latitude:  user.Latitude,
			Longitude: user.Longitude,
		}
	} else {
		// User exists, load user
		userModel = fetchedUserModel
		user = User{}.FromModel(&userModel)

		userOrganizations, err := s.GetOrganizationsByUser(ctx, GetOrganizationsByUserInput{
			UserID: user.UserID,
		})
		if err != nil {
			return Authentication{}, err
		}
		organizations = userOrganizations
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
		IsNewUser: isNewUser,
	}, nil
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

	// Log the magic code for easy development access
	a.logger.Info(ctx, "🔑 MAGIC CODE", "email", input.Email, "code", code)

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
	AccessToken string
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

	// Validate the access token with Google
	tokenInfo, err := s.validateGoogleToken(ctx, params.AccessToken)
	if err != nil {
		return Authentication{}, errors.Wrap(err, "failed to validate Google token")
	}

	if tokenInfo.Email == "" {
		return Authentication{}, errors.New("could not get email from Google token")
	}

	// Check if user exists
	var user User
	var organizations []OrganizationWithPermissions
	var userModel UserModel
	isNewUser := false

	fetchedUserModel, err := s.Repository.FetchUserByEmail(ctx, getUserByEmailParams{
		Email: tokenInfo.Email,
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return Authentication{}, err
		}

		// User does not exist, create new user
		name := tokenInfo.Name
		if name == "" {
			// Extract name from email
			if atIndex := strings.Index(tokenInfo.Email, "@"); atIndex > 0 {
				name = tokenInfo.Email[:atIndex]
			} else {
				name = tokenInfo.Email
			}
		}

		registerOutput, createErr := s.RegisterUser(ctx, RegisterUserInput{
			Name:             name,
			Email:            tokenInfo.Email,
			OrganizationName: tokenInfo.Email,
			Role:             RoleRegularManager,
		})
		if createErr != nil {
			return Authentication{}, createErr
		}

		isNewUser = true
		user = registerOutput.User
		organizations = []OrganizationWithPermissions{registerOutput.Organization}
		userModel = UserModel{
			UserID:    user.UserID,
			Name:      user.Name,
			Email:     user.Email,
			Phone:     user.Phone,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
			Address:   user.Address,
			City:      user.City,
			State:     user.State,
			Zip:       user.Zip,
			Country:   user.Country,
			Latitude:  user.Latitude,
			Longitude: user.Longitude,
		}
	} else {
		// User exists
		userModel = fetchedUserModel
		user = User{}.FromModel(&userModel)

		userOrganizations, err := s.GetOrganizationsByUser(ctx, GetOrganizationsByUserInput{
			UserID: user.UserID,
		})
		if err != nil {
			return Authentication{}, err
		}
		organizations = userOrganizations
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
		IsNewUser: isNewUser,
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
