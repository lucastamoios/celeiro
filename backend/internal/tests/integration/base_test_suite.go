package integration

import (
	"context"
	"fmt"
	"strings"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/config"
	testsetup "github.com/catrutech/celeiro/internal/tests/setup"
	"github.com/catrutech/celeiro/internal/web/middlewares"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"

	"github.com/stretchr/testify/suite"
)

// BaseTestSuite provides common setup functionality for integration tests
type BaseTestSuite struct {
	suite.Suite
	App        *application.Application
	DB         database.Database
	Redis      transientdb.TransientDatabase
	Logger     logging.Logger
	Config     config.Config
	Mailer     mailer.Mailer
	Middleware middlewares.Middleware
	System     *system.System
}

// TestTokenGenerator for unique test tokens
type TestTokenGenerator struct {
	counter int
}

func (t *TestTokenGenerator) Generate(length int) string {
	t.counter++
	return fmt.Sprintf("test-session-token-%d", t.counter)
}

// SetupBaseSuite initializes the common test infrastructure
func (base *BaseTestSuite) SetupBaseSuite() {
	base.Logger = &logging.TestLogger{}
	base.DB = testsetup.GetDB(base.Logger)
	base.Redis = testsetup.GetRedis(base.Logger)
	base.Config = config.Config{EmailFrom: "test@example.com"}

	base.Mailer = mailer.NewLocalMailer(&base.Config, base.Logger)
	base.Mailer.(*mailer.LocalMailer).ClearSentEmails()

	// Create system with predictable generators for testing
	base.System = &system.System{
		UUID:         system.NewUUIDGenerator(),
		Int:          system.NewIntGenerator(),
		Time:         system.NewTimeGenerator(),
		SessionToken: &TestTokenGenerator{},
		String:       system.NewStringGenerator(),
	}

	// Initialize all repositories and services
	accountsRepo := accounts.NewRepository(base.DB)
	accountsService := accounts.New(accountsRepo, base.Redis, base.Mailer, base.System, base.Logger, base.DB)

	base.App = &application.Application{
		AccountsService: accountsService,
	}

	base.Middleware = middlewares.NewMiddleware(base.App, base.Logger)
}

// SetupBaseTest clears state before each test
func (base *BaseTestSuite) SetupBaseTest() {
	base.Mailer.(*mailer.LocalMailer).ClearSentEmails()
}

// AuthHelper represents an authenticated user for testing
type AuthHelper struct {
	userID         int
	organizationID int
	sessionToken   string
	userEmail      string
	userName       string
	orgName        string
}

// CreateUserAndAuthenticate creates a new user, registers them, and authenticates them
func (test *BaseTestSuite) CreateUserAndAuthenticate(userEmail, userName, orgName string) *AuthHelper {
	input := accounts.RegisterUserInput{
		Email:            userEmail,
		Name:             userName,
		OrganizationName: orgName,
		Role:             accounts.RoleAdmin,
	}
	output, err := test.App.AccountsService.RegisterUser(context.Background(), input)
	test.Require().NoError(err)

	// Request magic link
	magicLinkOutput, err := test.App.AccountsService.RequestMagicLinkViaEmail(context.Background(), accounts.RequestMagicLinkViaEmailInput{
		Email:           userEmail,
		CheckUserExists: true,
	})
	test.Require().NoError(err)

	// Authenticate with magic code
	authOutput, err := test.App.AccountsService.AuthenticateWithMagicCode(context.Background(), accounts.AuthenticateWithMagicCodeInput{
		Email: userEmail,
		Code:  magicLinkOutput.Code,
	})
	test.Require().NoError(err)

	return &AuthHelper{
		userID:         output.User.UserID,
		organizationID: output.Organization.OrganizationID,
		sessionToken:   authOutput.Session.Token,
		userEmail:      userEmail,
		userName:       userName,
		orgName:        orgName,
	}
}

// CreateOrganization creates a single organization for testing
func (test *BaseTestSuite) CreateOrganization(orgName string) int {
	input := accounts.RegisterUserInput{
		Email:            "admin@" + strings.ToLower(strings.ReplaceAll(orgName, " ", "")) + ".com",
		Name:             "Admin User",
		OrganizationName: orgName,
		Role:             accounts.RoleAdmin,
	}
	output, err := test.App.AccountsService.RegisterUser(context.Background(), input)
	test.Require().NoError(err)
	return output.Organization.OrganizationID
}

// CreateMultipleUsers creates multiple authenticated users in the same organization
func (test *BaseTestSuite) CreateMultipleUsers(count int, orgName string) []*AuthHelper {
	helpers := make([]*AuthHelper, count)

	// Create the organization first
	organizationID := test.CreateOrganization(orgName)

	for i := 0; i < count; i++ {
		userEmail := fmt.Sprintf("user%d@%s.com", i+1, strings.ToLower(strings.ReplaceAll(orgName, " ", "")))
		userName := fmt.Sprintf("User %d", i+1)

		// Create user in the existing organization
		helpers[i] = test.CreateUserInOrganization(userEmail, userName, organizationID)
	}

	return helpers
}

// CreateUserInOrganization creates and authenticates a user in an existing organization
func (test *BaseTestSuite) CreateUserInOrganization(userEmail, userName string, organizationID int) *AuthHelper {
	input := accounts.RegisterUserInput{
		Email:            userEmail,
		Name:             userName,
		OrganizationID:   organizationID, // Use existing organization
		OrganizationName: "dummy",        // Required by validation even when using OrganizationID
		Role:             accounts.RoleAdmin,
	}
	output, err := test.App.AccountsService.RegisterUser(context.Background(), input)
	test.Require().NoError(err)

	// Request magic link
	magicOutput, err := test.App.AccountsService.RequestMagicLinkViaEmail(context.Background(), accounts.RequestMagicLinkViaEmailInput{
		Email:           userEmail,
		CheckUserExists: true,
	})
	test.Require().NoError(err)

	// Authenticate with magic code
	authOutput, err := test.App.AccountsService.AuthenticateWithMagicCode(context.Background(), accounts.AuthenticateWithMagicCodeInput{
		Email: userEmail,
		Code:  magicOutput.Code,
	})
	test.Require().NoError(err)

	return &AuthHelper{
		userID:         output.User.UserID,
		userEmail:      userEmail,
		userName:       userName,
		orgName:        output.Organization.Name,
		organizationID: output.Organization.OrganizationID,
		sessionToken:   authOutput.Session.Token,
	}
}

// GetUserID returns the user ID for this authenticated user
func (a *AuthHelper) GetUserID() int {
	return a.userID
}

// GetOrganizationID returns the organization ID for this authenticated user
func (a *AuthHelper) GetOrganizationID() int {
	return a.organizationID
}

// GetSessionToken returns the session token for this authenticated user
func (a *AuthHelper) GetSessionToken() string {
	return a.sessionToken
}

// GetAuthHeader returns the Authorization header value for this authenticated user
func (a *AuthHelper) GetAuthHeader() string {
	return "Bearer " + a.sessionToken
}

// GetUserEmail returns the user email
func (a *AuthHelper) GetUserEmail() string {
	return a.userEmail
}

// GetUserName returns the user name
func (a *AuthHelper) GetUserName() string {
	return a.userName
}

// GetOrgName returns the organization name
func (a *AuthHelper) GetOrgName() string {
	return a.orgName
}
