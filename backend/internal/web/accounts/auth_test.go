package accounts

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/config"
	testsetup "github.com/catrutech/celeiro/internal/tests/setup"
	"github.com/catrutech/celeiro/internal/web/middlewares"
	"github.com/catrutech/celeiro/internal/web/responses"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"

	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

func TestAccountsTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}

type AuthTestSuite struct {
	suite.Suite
	app        *application.Application
	db         database.Database
	redis      transientdb.TransientDatabase
	system     *system.System
	logger     logging.Logger
	config     config.Config
	mailer     mailer.Mailer
	middleware middlewares.Middleware
}

type TokenGenerator struct {
	token string
}

func (t *TokenGenerator) Generate(length int) string {
	return t.token
}

func (test *AuthTestSuite) SetupSuite() {
	test.logger = &logging.TestLogger{}
	db := testsetup.GetDB(test.logger)
	redis := testsetup.GetRedis(test.logger)
	test.db = db
	test.redis = redis
	test.config = config.Config{
		EmailFrom:   "test@example.com",
		FrontendURL: "http://localhost:51111",
	}

	test.mailer = mailer.NewLocalMailer(&test.config, test.logger)
	test.mailer.(*mailer.LocalMailer).ClearSentEmails()
	repo := accounts.NewRepository(test.db)
	sys := &system.System{
		// If needed, we can change the generators to test specific values
		UUID:         system.NewUUIDGenerator(),
		Int:          system.NewIntGenerator(),
		Time:         system.NewTimeGenerator(),
		SessionToken: &TokenGenerator{token: "1234"},
		String:       system.NewStringGenerator(),
	}
	test.system = sys
	accountsService := accounts.New(repo, test.redis, test.mailer, sys, test.logger, test.db, &test.config)
	test.app = &application.Application{
		AccountsService: accountsService,
	}
	test.middleware = middlewares.NewMiddleware(test.app, test.logger)
}

func (test *AuthTestSuite) SetupTest() {
	test.mailer.(*mailer.LocalMailer).ClearSentEmails()
}

func (test *AuthTestSuite) TestRequestMagicLinkRequest() {
	test.Run("valid email", func() {
		request := RequestMagicLinkRequest{Email: "test@example.com"}
		test.NoError(request.Validate())
	})
	test.Run("empty email", func() {
		request := RequestMagicLinkRequest{Email: ""}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email is required")
	})
	test.Run("whitespace only email", func() {
		request := RequestMagicLinkRequest{Email: "   "}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email is required")
	})
	test.Run("invalid email format - no @", func() {
		request := RequestMagicLinkRequest{Email: "testexample.com"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
	test.Run("invalid email format - no dot", func() {
		request := RequestMagicLinkRequest{Email: "test@example"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
	test.Run("invalid email format - too short", func() {
		request := RequestMagicLinkRequest{Email: "a@b"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
	test.Run("invalid email format - too long", func() {
		request := RequestMagicLinkRequest{Email: "a@b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
	test.Run("invalid email format - whitespace", func() {
		request := RequestMagicLinkRequest{Email: "test@example .com "}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
}

func (test *AuthTestSuite) TestValidateCodeRequest() {
	test.Run("valid request", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: "1234"}
		test.NoError(request.Validate())
	})
	test.Run("empty email", func() {
		request := AuthenticateRequest{Email: "", Code: "1234"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email is required")
	})
	test.Run("whitespace email", func() {
		request := AuthenticateRequest{Email: "   ", Code: "1234"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email is required")
	})
	test.Run("invalid email format", func() {
		request := AuthenticateRequest{Email: "invalid", Code: "1234"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "email format is invalid")
	})
	test.Run("empty code", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: ""}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "code is required")
	})
	test.Run("whitespace code", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: "   "}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "code is required")
	})
	test.Run("code too short", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: "123"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "code must be 4 digits")
	})
	test.Run("code too long", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: "12345"}
		test.Error(request.Validate())
		test.Equal(request.Validate().Error(), "code must be 4 digits")
	})
	test.Run("code with whitespace but correct length", func() {
		request := AuthenticateRequest{Email: "test@example.com", Code: " 1234 "}
		test.NoError(request.Validate())
	})
}

func (test *AuthTestSuite) TestRequestMagicLinkHandler() {
	test.Run("successful request", func() {
		userUUID := uuid.New()
		w := test.requestMagicLink(fmt.Sprintf(`{"email":"%s@example.com"}`, userUUID))
		test.Equal(w.Code, http.StatusOK)
		var r responses.APIResponse[any]
		test.NoError(json.NewDecoder(w.Body).Decode(&r))
		test.mailer.(*mailer.LocalMailer).ClearSentEmails()
	})

	test.Run("invalid JSON", func() {
		w := test.requestMagicLink(`{"email":}`)
		test.Equal(http.StatusBadRequest, w.Code)
		var r responses.APIResponse[any]
		test.NoError(json.NewDecoder(w.Body).Decode(&r))
	})

	test.Run("invalid email", func() {
		w := test.requestMagicLink(`{"email":"invalid"}`)
		test.Equal(http.StatusBadRequest, w.Code)
		var r responses.APIResponse[any]
		test.NoError(json.NewDecoder(w.Body).Decode(&r))
	})

	test.Run("code generation error", func() {
		userUUID := uuid.New()
		test.mailer.(*mailer.LocalMailer).SetTestError(fmt.Errorf("email service error"))
		w := test.requestMagicLink(fmt.Sprintf(`{"email":"%s@example.com"}`, userUUID))
		test.Equal(http.StatusInternalServerError, w.Code)
		var r responses.APIResponse[any]
		test.NoError(json.NewDecoder(w.Body).Decode(&r))
		sentMessages, err := test.mailer.(*mailer.LocalMailer).GetSentEmails()
		test.NoError(err)
		test.Equal(len(sentMessages), 0, "expected no emails to be sent")
		test.mailer.(*mailer.LocalMailer).SetTestError(nil)
	})
}

func (test *AuthTestSuite) TestValidateCodeHandler() {
	test.logger.(*logging.TestLogger).SetShowStackTrace()
	makeRequest := func(body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler := &handler{
			accountsService: test.app.AccountsService,
		}
		test.middleware.LogError(http.HandlerFunc(handler.Authenticate)).ServeHTTP(w, req)
		return w
	}

	test.Run("successful validation", func() {
		userName := test.system.String.GenerateAlphanumeric(10)
		email := fmt.Sprintf("%s@example.com", userName)

		test.requestMagicLink(fmt.Sprintf(`{"email":"%s"}`, email))
		sentMessages, err := test.mailer.(*mailer.LocalMailer).GetSentEmails()
		test.Require().NoError(err)
		test.Require().Len(sentMessages, 1, "expected 1 email to be sent")

		code := sentMessages[0].Message.Data["code"]
		test.Require().NotNil(code)
		test.Require().IsType(code, "string")
		codeStr := code.(string) //nolint:forcetypeassert

		test.logger.Debug(context.Background(), "Magic code sent", "code", codeStr, "email", userName)
		w := makeRequest(fmt.Sprintf(`{"email":"%s","code":"%s"}`, email, codeStr))
		var r responses.APIResponse[AuthenticateResponse]
		test.Equal(http.StatusOK, w.Code)
		test.NoError(json.NewDecoder(w.Body).Decode(&r))
		test.Equal("1234", r.Data.SessionToken, "expected session token to be 1234")
		test.True(r.Data.SessionInfo.IsNewUser, "expected is_new_user to be true")
		test.Equal(email, r.Data.SessionInfo.User.Email, "expected user email to be "+email)
		test.Equal(1, r.Data.SessionInfo.User.ID, "expected user id to be 1")
		test.Equal(time.Now().Format(time.RFC3339), r.Data.SessionCreatedAt, "expected session created at to be "+time.Now().Format(time.RFC3339))
		test.Equal(time.Now().AddDate(0, 1, -1).Format(time.RFC3339), r.Data.SessionExpiresAt, "expected session expires at to be one month from now")
	})
}

func (test *AuthTestSuite) requestMagicLink(body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", "/magic-link/request", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler := &handler{
		accountsService: test.app.AccountsService,
	}
	test.middleware.LogError(http.HandlerFunc(handler.RequestMagicLink)).ServeHTTP(w, req)
	return w
}

// func TestValidateCodeHandler_SuccessfulValidationExistingUser(t *testing.T) {
// 	app := setupTestApp()

// 	// Setup
// 	key := "magic_code:test@example.com"
// 	magicCode := `{"code":"1234","email":"test@example.com","expires_at":"2099-01-01T00:00:00Z"}`
// 	app.memoryDB.SetTestData(key, magicCode)

// 	expectedUser := &accounts.UserModel{
// 		UserID: 1,
// 		Name:   "test",
// 		Email:  "test@example.com",
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.FetchUserByEmailQuery,
// 		"test@example.com",
// 	).WillReturn(expectedUser)

// 	expectedOrganizations := []accounts.OrganizationModel{
// 		{
// 			OrganizationID: 1,
// 			Name:           "test",
// 		},
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.FetchOrganizationsByUserQuery,
// 		1,
// 	).WillReturn(expectedOrganizations)

// 	// Execute

// 	// Assert
// 	if w.Code != http.StatusOK {
// 		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "Login successful" {
// 		t.Errorf("Expected message 'Login successful', got '%s'", response.Message)
// 	}
// 	if response.Error != nil {
// 		t.Error("Expected success to be true")
// 	}
// 	if response.Data.IsNewUser {
// 		t.Error("Expected is_new_user to be false")
// 	}
// 	if response.Data.SessionToken == "" {
// 		t.Error("Expected session to be included in successful response")
// 	}

// 	// Check mock expectations
// 	if app.memoryDB.HasKey(key) {
// 		t.Error("Expected magic code to be deleted after validation")
// 	}
// 	if err := app.persistentDB.ExpectationsWereMet(); err != nil {
// 		t.Errorf("Database expectations not met: %v", err)
// 	}
// }

// func TestValidateCodeHandler_SuccessfulValidationNewUser(t *testing.T) {
// 	app := setupTestApp()

// 	// Setup
// 	key := "magic_code:newuser@example.com"
// 	magicCode := `{"code":"5678","email":"newuser@example.com","expires_at":"2099-01-01T00:00:00Z"}`
// 	app.memoryDB.SetTestData(key, magicCode)

// 	app.persistentDB.ExpectQuery(
// 		accounts.FetchUserByEmailQuery,
// 		"newuser@example.com",
// 	).WillReturnError(sql.ErrNoRows)

// 	expectedOrganization := &accounts.OrganizationModel{
// 		OrganizationID: 1,
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.InsertOrganizationQuery,
// 	).WillReturn(expectedOrganization)

// 	expectedUser := &accounts.UserModel{
// 		UserID: 1,
// 		Name:   "newuser",
// 		Email:  "newuser@example.com",
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.InsertUserQuery,
// 		"newuser", "newuser@example.com", "",
// 	).WillReturn(expectedUser)

// 	expectedUserOrganization := &accounts.UserOrganizationModel{
// 		UserID:         1,
// 		OrganizationID: 1,
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.InsertUserOrganizationQuery,
// 		1, 1,
// 	).WillReturn(expectedUserOrganization)

// 	// Execute
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"newuser@example.com","code":"5678"}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusOK {
// 		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "Login successful" {
// 		t.Errorf("Expected message 'Login successful', got '%s'", response.Message)
// 	}
// 	if response.Error != nil {
// 		t.Error("Expected success to be true")
// 	}
// 	if !response.Data.IsNewUser {
// 		t.Error("Expected is_new_user to be true")
// 	}
// 	if response.Data.SessionToken == "" {
// 		t.Error("Expected session to be included in successful response")
// 	}

// 	// Check mock expectations
// 	if app.memoryDB.HasKey(key) {
// 		t.Error("Expected magic code to be deleted after validation")
// 	}
// 	if err := app.persistentDB.ExpectationsWereMet(); err != nil {
// 		t.Errorf("Database expectations not met: %v", err)
// 	}
// }

// func TestValidateCodeHandler_InvalidJSON(t *testing.T) {
// 	app := setupTestApp()

// 	// Execute
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusBadRequest {
// 		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "invalid JSON syntax" {
// 		t.Errorf("Expected message 'invalid JSON syntax', got '%s'", response.Message)
// 	}
// 	if response.Success {
// 		t.Error("Expected success to be false")
// 	}
// }

// func TestValidateCodeHandler_InvalidEmail(t *testing.T) {
// 	app := setupTestApp()

// 	// Execute
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"invalid","code":"1234"}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusBadRequest {
// 		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "email format is invalid" {
// 		t.Errorf("Expected message 'email format is invalid', got '%s'", response.Message)
// 	}
// 	if response.Success {
// 		t.Error("Expected success to be false")
// 	}
// }

// func TestValidateCodeHandler_InvalidCodeFormat(t *testing.T) {
// 	app := setupTestApp()

// 	// Execute
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"test@example.com","code":"123"}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusBadRequest {
// 		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "code must be 4 digits" {
// 		t.Errorf("Expected message 'code must be 4 digits', got '%s'", response.Message)
// 	}
// 	if response.Success {
// 		t.Error("Expected success to be false")
// 	}
// }

// func TestValidateCodeHandler_ValidationErrorNoCode(t *testing.T) {
// 	app := setupTestApp()

// 	// Execute (no setup - no code stored)
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"test@example.com","code":"5678"}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusUnauthorized {
// 		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "magic code validation failed: activation failed" {
// 		t.Errorf("Expected message 'magic code validation failed: activation failed', got '%s'", response.Message)
// 	}
// 	if response.Success {
// 		t.Error("Expected success to be false")
// 	}
// }

// func TestValidateCodeHandler_ValidationErrorWrongCode(t *testing.T) {
// 	app := setupTestApp()

// 	// Setup - store code "1234" but try to validate with "5678"
// 	key := "magic_code:test@example.com"
// 	magicCode := `{"code":"1234","email":"test@example.com","expires_at":"2099-01-01T00:00:00Z"}`
// 	app.memoryDB.SetTestData(key, magicCode)

// 	// Execute
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"test@example.com","code":"5678"}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusUnauthorized {
// 		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "invalid code" {
// 		t.Errorf("Expected message 'invalid code', got '%s'", response.Message)
// 	}
// 	if response.Success {
// 		t.Error("Expected success to be false")
// 	}
// }

// func TestValidateCodeHandler_CodeWithWhitespace(t *testing.T) {
// 	app := setupTestApp()

// 	// Setup
// 	key := "magic_code:test@example.com"
// 	magicCode := `{"code":"1234","email":"test@example.com","expires_at":"2099-01-01T00:00:00Z"}`
// 	app.memoryDB.SetTestData(key, magicCode)

// 	expectedUser := &accounts.UserModel{
// 		UserID: 1,
// 		Name:   "test",
// 		Email:  "test@example.com",
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.FetchUserByEmailQuery,
// 		"test@example.com",
// 	).WillReturn(expectedUser)

// 	expectedOrganizations := []accounts.OrganizationModel{
// 		{
// 			OrganizationID: 1,
// 			Name:           "test",
// 		},
// 	}
// 	app.persistentDB.ExpectQuery(
// 		accounts.FetchOrganizationsByUserQuery,
// 		1,
// 	).WillReturn(expectedOrganizations)

// 	// Execute - code with whitespace should be trimmed
// 	req := httptest.NewRequest("POST", "/magic-link/validate", strings.NewReader(`{"email":"test@example.com","code":" 1234 "}`))
// 	req.Header.Set("Content-Type", "application/json")
// 	w := httptest.NewRecorder()

// 	handler := &Handler{
// 		accountsService: app.application.AccountsService,
// 	}
// 	handler.ValidateCode(w, req)

// 	// Assert
// 	if w.Code != http.StatusOK {
// 		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
// 	}

// 	var response responses.APIResponse[ValidateCodeResponse]
// 	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
// 		t.Errorf("Failed to decode response: %v", err)
// 	}

// 	if response.Message != "Login successful" {
// 		t.Errorf("Expected message 'Login successful', got '%s'", response.Message)
// 	}
// 	if response.Error != nil {
// 		t.Error("Expected success to be true")
// 	}
// 	if response.Data.IsNewUser {
// 		t.Error("Expected is_new_user to be false")
// 	}
// 	if response.Data.SessionToken == "" {
// 		t.Error("Expected session to be included in successful response")
// 	}

// 	// Check mock expectations
// 	if err := app.persistentDB.ExpectationsWereMet(); err != nil {
// 		t.Errorf("Database expectations not met: %v", err)
// 	}
// }
