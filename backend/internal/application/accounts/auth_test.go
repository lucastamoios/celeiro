package accounts

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"

	"github.com/lib/pq"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type AuthTestSuite struct {
	suite.Suite
}

func TestAuthTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}

func (test *AuthTestSuite) TestGenerateCode() {
	service := &service{}
	code := service.generateCode()
	test.Require().Len(code, 4)
	test.Regexp(`^\d{4}$`, code)
}

func (test *AuthTestSuite) TestGenerateMagicLinkCode() {
	test.Run("success", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		var magicCode MagicCode
		memoryDB.On("SetWithExpiration",
			mock.Anything,
			fmt.Sprintf("magic_code:%s", email),
			mock.MatchedBy(func(value string) bool {
				return json.Unmarshal([]byte(value), &magicCode) == nil && magicCode.Email == email
			}),
			mock.AnythingOfType("time.Duration"),
		).Return(nil)
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		code, err := service.generateMagicLinkCode(ctx, generateMagicLinkCodeInput{
			Email:           email,
			CheckUserExists: false,
		})
		test.Require().NoError(err)
		test.Require().Len(code, 4)
		test.Regexp(`^\d{4}$`, code)
	})

	test.Run("database error", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		memoryDB.On("SetWithExpiration", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(fmt.Errorf("database error"))
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		_, err := service.generateMagicLinkCode(ctx, generateMagicLinkCodeInput{
			Email:           email,
			CheckUserExists: false,
		})
		test.Require().Error(err)
		test.Equal(err.Error(), "failed to store magic code: database error")
	})
}

func (test *AuthTestSuite) TestValidateMagicLinkCode() {
	test.Run("success", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		code := "1234"
		magicCode := MagicCode{
			Code:      code,
			Email:     email,
			ExpiresAt: time.Now().Add(10 * time.Minute),
		}
		codeJSON, err := json.Marshal(magicCode)
		test.Require().NoError(err)
		memoryDB.On("Get", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return(string(codeJSON), nil)
		memoryDB.On("Delete", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return(nil)

		err = service.validateMagicLinkCode(ctx, validateMagicLinkCodeInput{
			Email: email,
			Code:  code,
		})
		test.Require().NoError(err)
		memoryDB.AssertExpectations(test.T())
	})

	test.Run("database error", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		memoryDB.On("Get", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return("", errors.New("database error"))

		err := service.validateMagicLinkCode(ctx, validateMagicLinkCodeInput{
			Email: email,
			Code:  "1234",
		})
		test.Require().Error(err)
		test.Equal("magic code validation failed: activation failed", err.Error())
		memoryDB.AssertExpectations(test.T())
	})

	test.Run("invalid code", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		code := "1234"
		magicCode := MagicCode{
			Code:      code,
			Email:     email,
			ExpiresAt: time.Now().Add(10 * time.Minute),
		}
		codeJSON, _ := json.Marshal(magicCode)
		memoryDB.On("Get", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return(string(codeJSON), nil)

		err := service.validateMagicLinkCode(ctx, validateMagicLinkCodeInput{
			Email: email,
			Code:  "0000",
		})
		test.Require().Error(err)
		test.Equal("invalid code", err.Error())
		memoryDB.AssertExpectations(test.T())
	})

	test.Run("expired code", func() {
		email := fmt.Sprintf("test%d@example.com", time.Now().UnixNano())
		memoryDB := transientdb.NewMockTransientDatabase(test.T())
		logger := logging.TestLogger{}
		localMailer := mailer.NewLocalMailer(&config.Config{}, &logger)
		localMailer.(*mailer.LocalMailer).ClearSentEmails()
		service := New(nil, memoryDB, localMailer, system.NewSystem(), &logger, nil, &config.Config{})

		ctx := context.Background()

		code := "1234"
		magicCode := MagicCode{
			Code:      code,
			Email:     email,
			ExpiresAt: time.Now().Add(-1 * time.Minute),
		}
		codeJSON, _ := json.Marshal(magicCode)
		memoryDB.On("Get", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return(string(codeJSON), nil)
		memoryDB.On("Delete", mock.Anything, fmt.Sprintf("magic_code:%s", email)).Return(nil)

		err := service.validateMagicLinkCode(ctx, validateMagicLinkCodeInput{
			Email: email,
			Code:  code,
		})
		test.Require().Error(err)
		test.Equal("code has expired", err.Error())
		memoryDB.AssertExpectations(test.T())
	})
}

func TestSendMagicLinkEmail_Success(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)
	localMailer.(*mailer.LocalMailer).ClearSentEmails()
	service := New(nil, memoryDB, localMailer, system.NewSystem(), logger, nil, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	err = service.sendMagicLinkEmail(ctx, sendMagicLinkEmailInput{
		Email: email,
		Code:  code,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	sentMessages, err := localMailer.(*mailer.LocalMailer).GetSentEmails()
	if err != nil {
		t.Errorf("Failed to get sent emails: %v", err)
	}
	if len(sentMessages) != 1 {
		t.Errorf("Expected 1 sent message, got %d", len(sentMessages))
	}

	message := sentMessages[0].Message
	if len(message.To) != 1 || message.To[0] != email {
		t.Errorf("Expected To: [%s], got %v", email, message.To)
	}
	if message.Subject != "Seu Código de Acesso - Celeiro" {
		t.Errorf("Expected subject 'Seu Código de Acesso - Celeiro', got %s", message.Subject)
	}
	if message.Data["Code"] != code {
		t.Errorf("Expected body to contain code %s", code)
	}
}

func TestSendMagicLinkEmail_NoMailer(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	service := New(nil, memoryDB, nil, system.NewSystem(), logger, nil, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	err = service.sendMagicLinkEmail(ctx, sendMagicLinkEmailInput{
		Email: email,
		Code:  code,
	})

	if err != nil {
		t.Errorf("Expected no error when mailer is nil, got %v", err)
	}
}

func TestSendMagicLinkEmail_MailerError(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)
	localMailer.(*mailer.LocalMailer).SetTestError(fmt.Errorf("mailer error"))
	service := New(nil, memoryDB, localMailer, system.NewSystem(), logger, nil, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	err = service.sendMagicLinkEmail(ctx, sendMagicLinkEmailInput{
		Email: email,
		Code:  code,
	})

	if err == nil {
		t.Error("Expected error when mailer fails")
	}
}

func TestGetMagicCodeKey(t *testing.T) {
	service := &service{}
	email := "test@example.com"

	key := service.getMagicCodeKey(email)

	expected := "magic_code:test@example.com"
	if key != expected {
		t.Errorf("Expected key %s, got %s", expected, key)
	}
}

func TestAuthenticateWithMagicCode_InvalidCode(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)

	service := &service{
		transientDB: memoryDB,
		mailer:      localMailer,
	}

	ctx := context.Background()
	email := "test@example.com"
	code := "wrong-code"

	result, err := service.AuthenticateWithMagicCode(ctx, AuthenticateWithMagicCodeInput{
		Email: email,
		Code:  code,
	})

	if err == nil {
		t.Error("Expected error for invalid code")
	}
	if result.Session.Token != "" {
		t.Error("Expected no result for invalid code")
	}
	if !strings.Contains(err.Error(), "magic code validation failed: activation failed") {
		t.Errorf("Expected 'magic code validation failed: activation failed' error, got %v", err)
	}
}

func TestAuthenticateWithMagicCode_ExistingUser(t *testing.T) {
	transientDB := transientdb.NewMemoryTransientDB()
	persistentDB := database.NewMemoryDatabase()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)
	system := system.NewSystem()

	expectedUser := &UserModel{
		UserID: 1,
		Name:   "Test User",
		Email:  "test@example.com",
	}
	persistentDB.ExpectQuery(
		FetchUserByEmailQuery,
		"test@example.com",
	).WillReturn(expectedUser)

	expectedOrganizations := []OrganizationWithPermissionsModel{
		{
			OrganizationModel: OrganizationModel{
				OrganizationID: 1,
				Name:           "Test Organization",
				City:           "Test City",
				State:          "Test State",
				Zip:            "12345",
				Country:        "Test Country",
				Latitude:       0,
				Longitude:      0,
			},
			UserRole:        RoleAdmin,
			UserPermissions: pq.StringArray{"view_organizations"}, // Use pq.StringArray!
		},
	}
	persistentDB.ExpectQuery(FetchOrganizationsByUserQuery, 1).WillReturn(expectedOrganizations)

	repo := NewRepository(persistentDB)
	service := New(repo, transientDB, localMailer, system, logger, nil, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	magicCode := MagicCode{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	codeJSON, _ := json.Marshal(magicCode)
	key := fmt.Sprintf("magic_code:%s", email)
	transientDB.SetTestData(key, string(codeJSON))

	result, err := service.AuthenticateWithMagicCode(ctx, AuthenticateWithMagicCodeInput{
		Email: email,
		Code:  code,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if result.Session.Token == "" {
		t.Fatal("Expected result to be returned")
	}
	if result.IsNewUser {
		t.Error("Expected IsNewUser to be false for existing user")
	}
	if result.Session.Token == "" {
		t.Fatal("Expected session to be created")
	}
	if result.Session.Info.User.ID != 1 {
		t.Errorf("Expected user ID 1, got %d", result.Session.Info.User.ID)
	}
	if result.Session.Info.User.Email != email {
		t.Errorf("Expected user email %s, got %s", email, result.Session.Info.User.Email)
	}
	if result.Session.Info.Organizations[0].OrganizationID != 1 {
		t.Errorf("Expected organization ID 1, got %d", result.Session.Info.Organizations[0].OrganizationID)
	}

	if err := persistentDB.ExpectationsWereMet(); err != nil {
		t.Errorf("Database expectations not met: %v", err)
	}
}

// TestAuthenticateWithMagicCode_NewUser verifies that unregistered users are rejected.
// Auto-registration via magic link is disabled — only existing users can authenticate.
func TestAuthenticateWithMagicCode_NewUser(t *testing.T) {
	transientDB := transientdb.NewMemoryTransientDB()
	persistentDB := database.NewMemoryDatabase()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)

	// User does not exist — auto-registration is disabled
	persistentDB.ExpectQuery(
		FetchUserByEmailQuery,
		"test@example.com",
	).WillReturnError(sql.ErrNoRows)

	repo := NewRepository(persistentDB)
	service := New(repo, transientDB, localMailer, system.NewSystem(), logger, persistentDB, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	magicCode := MagicCode{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	codeJSON, _ := json.Marshal(magicCode)
	transientDB.SetTestData(fmt.Sprintf("magic_code:%s", email), string(codeJSON))

	result, err := service.AuthenticateWithMagicCode(ctx, AuthenticateWithMagicCodeInput{
		Email: email,
		Code:  code,
	})

	if err == nil {
		t.Error("Expected ErrInvalidCredentials for unregistered user, got no error")
	}
	if result.Session.Token != "" {
		t.Error("Expected no session token for unregistered user")
	}
	if !strings.Contains(err.Error(), "invalid credentials") {
		t.Errorf("Expected 'invalid credentials' error, got %v", err)
	}
	if dbErr := persistentDB.ExpectationsWereMet(); dbErr != nil {
		t.Errorf("Database expectations not met: %v", dbErr)
	}
}

// TestAuthenticateWithMagicCode_UserFetchError verifies that a DB error during user lookup
// returns an error (not ErrInvalidCredentials — that's reserved for user-not-found).
func TestAuthenticateWithMagicCode_UserFetchError(t *testing.T) {
	transientDB := transientdb.NewMemoryTransientDB()
	persistentDB := database.NewMemoryDatabase()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)

	// Simulate a DB error (not sql.ErrNoRows)
	persistentDB.ExpectQuery(
		FetchUserByEmailQuery,
		"test@example.com",
	).WillReturnError(fmt.Errorf("database error"))

	repo := NewRepository(persistentDB)
	service := New(repo, transientDB, localMailer, system.NewSystem(), logger, persistentDB, &config)

	ctx := context.Background()
	email := "test@example.com"
	code := "1234"

	magicCode := MagicCode{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	codeJSON, _ := json.Marshal(magicCode)
	transientDB.SetTestData(fmt.Sprintf("magic_code:%s", email), string(codeJSON))

	result, err := service.AuthenticateWithMagicCode(ctx, AuthenticateWithMagicCodeInput{
		Email: email,
		Code:  code,
	})

	if err == nil {
		t.Error("Expected error when user fetch fails")
	}
	if result.Session.Token != "" {
		t.Error("Expected no session token on fetch error")
	}
	if !strings.Contains(err.Error(), "database error") {
		t.Errorf("Expected 'database error' error, got %v", err)
	}
	if dbErr := persistentDB.ExpectationsWereMet(); dbErr != nil {
		t.Errorf("Database expectations not met: %v", dbErr)
	}
}
