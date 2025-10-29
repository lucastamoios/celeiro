package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/web/responses"

	accountsWeb "github.com/catrutech/celeiro/internal/web/accounts"

	"github.com/stretchr/testify/suite"
)

func TestAccountsTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}

type AuthTestSuite struct {
	BaseTestSuite
	accountsHandler accountsWeb.AccountsHandler
}

func (test *AuthTestSuite) SetupSuite() {
	test.SetupBaseSuite()
	test.accountsHandler = accountsWeb.NewHandler(test.App)
}

func (test *AuthTestSuite) SetupTest() {
	test.SetupBaseTest()
}

func (test *AuthTestSuite) TestAccountsFlow() {
	userName := "Test User"
	userEmail := "test@example.com"
	organizationName := "Test Organization"
	var code string
	var sessionToken string

	test.Run("register user", func() {
		input := accounts.RegisterUserInput{
			Email:            userEmail,
			Name:             userName,
			OrganizationName: organizationName,
			Role:             accounts.RoleAdmin,
		}
		output, err := test.App.AccountsService.RegisterUser(context.Background(), input)
		test.NoError(err)
		test.Equal(output.User.Email, userEmail)
		test.Equal(output.User.Name, userName)
		test.Equal(output.Organization.Name, organizationName)
	})

	test.Run("request magic link", func() {
		input := accounts.RequestMagicLinkViaEmailInput{
			Email:           "test@example.com",
			CheckUserExists: true,
		}
		output, err := test.App.AccountsService.RequestMagicLinkViaEmail(context.Background(), input)
		test.Require().NoError(err)
		test.Require().NotEmpty(output.Code)
		test.Require().Regexp(`^\d{4}$`, output.Code)
		code = output.Code
	})

	test.Run("validate code", func() {
		input := accounts.AuthenticateWithMagicCodeInput{
			Email: userEmail,
			Code:  code,
		}
		output, err := test.App.AccountsService.AuthenticateWithMagicCode(context.Background(), input)
		test.Require().NoError(err)
		test.Require().NotNil(output)
		test.Require().NotNil(output.Session)
		test.Require().NotNil(output.Session.Info)

		test.Require().Equal(output.Session.Info.User.Email, userEmail)
		test.Require().Equal(output.Session.Info.User.Name, userName)
		test.Require().Equal(output.Session.Info.Organizations[0].Name, organizationName)
		test.Require().Equal(output.IsNewUser, false)
		test.Require().NotNil(output.Session.Token)
		sessionToken = output.Session.Token
	})

	test.Run("hit endpoint without authorization", func() {
		req := httptest.NewRequest("GET", "/me", nil)
		req.Header.Set("Authorization", "Bearer invalid-session-token")
		rr := httptest.NewRecorder()

		test.Middleware.Session(
			test.Middleware.RequireSession(
				test.accountsHandler.Me,
				[]accounts.Permission{},
			),
		).ServeHTTP(rr, req)

		test.Require().Equal(rr.Code, http.StatusUnauthorized)
	})

	test.Run("hit endpoint with authorization", func() {
		req := httptest.NewRequest("GET", "/me", nil)
		req.Header.Set("Authorization", "Bearer "+sessionToken)
		rr := httptest.NewRecorder()

		test.Middleware.Session(
			test.Middleware.RequireSession(
				test.accountsHandler.Me,
				[]accounts.Permission{},
			),
		).ServeHTTP(rr, req)

		test.Require().Equal(rr.Code, http.StatusOK)
		var sessionInfo responses.APIResponse[accountsWeb.SessionInfoResponse]
		json.Unmarshal(rr.Body.Bytes(), &sessionInfo)
		test.Require().Equal(sessionInfo.Data.User.ID, 1)
		test.Require().Equal(sessionInfo.Data.User.Email, userEmail)
		test.Require().Equal(sessionInfo.Data.Organizations[0].Name, organizationName)
	})
}

func (test *AuthTestSuite) TestAuthHelperFlow() {
	userName := "Helper Test User"
	userEmail := "helper@example.com"
	organizationName := "Helper Test Organization"

	test.Run("using auth helper", func() {
		// Test the new AuthHelper functionality
		auth := test.CreateUserAndAuthenticate(userEmail, userName, organizationName)

		// Verify helper provides correct data
		test.Require().True(auth.GetUserID() > 0)
		test.Require().True(auth.GetOrganizationID() > 0)
		test.Require().NotEmpty(auth.GetSessionToken())
		test.Require().Contains(auth.GetAuthHeader(), "Bearer ")

		// Test that the session actually works
		req := httptest.NewRequest("GET", "/me", nil)
		req.Header.Set("Authorization", auth.GetAuthHeader())
		rr := httptest.NewRecorder()

		test.Middleware.Session(
			test.Middleware.RequireSession(
				test.accountsHandler.Me,
				[]accounts.Permission{},
			),
		).ServeHTTP(rr, req)

		test.Require().Equal(rr.Code, http.StatusOK)
		var sessionInfo responses.APIResponse[accountsWeb.SessionInfoResponse]
		json.Unmarshal(rr.Body.Bytes(), &sessionInfo)
		test.Require().Equal(sessionInfo.Data.User.ID, auth.GetUserID())
		test.Require().Equal(sessionInfo.Data.User.Email, userEmail)
		test.Require().Equal(sessionInfo.Data.Organizations[0].Name, organizationName)
	})
}
