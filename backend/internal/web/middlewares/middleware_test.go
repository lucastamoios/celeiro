package middlewares

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/config"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/system"

	"github.com/stretchr/testify/suite"
)

func TestMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(MiddlewareTestSuite))
}

type MiddlewareTestSuite struct {
	suite.Suite
	app        *application.Application
	logger     logging.Logger
	middleware Middleware
}

func (test *MiddlewareTestSuite) SetupTest() {
	test.app = test.createTestApplication()
	test.logger = test.createTestLogger()
	test.middleware = NewMiddleware(test.app, test.logger)
}

func (test *MiddlewareTestSuite) createTestLogger() logging.Logger {
	logger, err := logging.NewOTelLogger(test.createTestConfig())
	test.Require().NoError(err)
	return logger
}

func (test *MiddlewareTestSuite) createTestConfig() *config.Config {
	return &config.Config{
		ServiceName:       "test-service",
		ServiceInstanceID: "test-instance",
		ServiceVersion:    "test-version",
		OTELEndpoint:      "localhost:4317",
	}
}

func (test *MiddlewareTestSuite) createTestApplication() *application.Application {
	persistentDB := database.NewMemoryDatabase()
	transientDB := transientdb.NewMemoryTransientDB()

	repo := accounts.NewRepository(persistentDB)
	system := system.NewSystem()
	accountsService := accounts.New(repo, transientDB, nil, system, test.logger, persistentDB)

	return &application.Application{
		AccountsService: accountsService,
	}
}

func (test *MiddlewareTestSuite) TestSessionMiddleware() {
	test.Run("with valid session", func() {
		userSession := accounts.SessionInfo{
			User: accounts.UserForSessionInfo{
				ID:    123,
				Email: "test@example.com",
			},
			Organizations: []accounts.OrganizationWithPermissions{
				{
					Organization: accounts.Organization{
						OrganizationID: 1,
						Name:           "Test Organization",
					},
					UserRole: accounts.RoleAdmin,
				},
			},
		}
		session, err := test.app.AccountsService.CreateSession(context.Background(), accounts.CreateSessionInput{
			Info: userSession,
		})
		test.Require().NoError(err)

		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			contextSession, err := test.app.AccountsService.GetSessionFromContext(r.Context())
			test.Require().NoError(err)
			test.Require().NotNil(contextSession)
			test.Equal(session.Token, contextSession.Token)
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+session.Token)

		rr := httptest.NewRecorder()
		test.middleware.Session(handler).ServeHTTP(rr, req)

		test.True(handlerCalled)
		test.Equal(http.StatusOK, rr.Code)
	})

	test.Run("with invalid session", func() {
		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			_, err := test.app.AccountsService.GetSessionFromContext(r.Context())
			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid-session-id")

		rr := httptest.NewRecorder()
		test.middleware.Session(handler).ServeHTTP(rr, req)

		test.True(handlerCalled)
		test.Equal(http.StatusUnauthorized, rr.Code)
	})

	test.Run("with invalid session when required", func() {
		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid-session-id")

		rr := httptest.NewRecorder()
		test.middleware.Session(test.middleware.RequireSession(handler, []accounts.Permission{})).ServeHTTP(rr, req)

		test.False(handlerCalled)
		test.Equal(http.StatusUnauthorized, rr.Code)
	})

	test.Run("with no session when required", func() {
		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)

		rr := httptest.NewRecorder()
		test.middleware.Session(test.middleware.RequireSession(handler, []accounts.Permission{})).ServeHTTP(rr, req)

		test.False(handlerCalled)
		test.Equal("Session required", strings.TrimSpace(rr.Body.String()))
		test.Equal(http.StatusUnauthorized, rr.Code)
	})

	test.Run("without required permissions", func() {
		userSession := accounts.SessionInfo{
			User: accounts.UserForSessionInfo{
				ID:    123,
				Email: "test@example.com",
			},
			Organizations: []accounts.OrganizationWithPermissions{
				{
					Organization: accounts.Organization{
						OrganizationID: 1,
						Name:           "Test Organization",
					},
					UserRole: accounts.RoleRegularUser,
					UserPermissions: []accounts.Permission{
						accounts.PermissionPerformRides,
						accounts.PermissionPerformRecycling,
						accounts.PermissionPerformVolunteering,
						accounts.PermissionPerformDonations,
					},
				},
			},
		}
		session, err := test.app.AccountsService.CreateSession(context.Background(), accounts.CreateSessionInput{
			Info: userSession,
		})
		test.Require().NoError(err)

		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			contextSession, err := test.app.AccountsService.GetSessionFromContext(r.Context())
			test.Require().NoError(err)
			test.Require().NotNil(contextSession)
			test.Equal(session.Token, contextSession.Token)
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+session.Token)

		rr := httptest.NewRecorder()
		permissions := []accounts.Permission{accounts.PermissionCreateRegularUsers}
		test.middleware.Session(test.middleware.RequireSession(handler, permissions)).ServeHTTP(rr, req)

		test.False(handlerCalled)
		test.Equal(http.StatusForbidden, rr.Code)
	})

	test.Run("with required permissions", func() {
		userSession := accounts.SessionInfo{
			User: accounts.UserForSessionInfo{
				ID:    123,
				Email: "test@example.com",
			},
			Organizations: []accounts.OrganizationWithPermissions{
				{
					Organization: accounts.Organization{
						OrganizationID: 1,
						Name:           "Test Organization",
					},
					UserRole: accounts.RoleRegularManager,
					UserPermissions: []accounts.Permission{
						accounts.PermissionCreateRegularUsers,
					},
				},
			},
		}
		session, err := test.app.AccountsService.CreateSession(context.Background(), accounts.CreateSessionInput{
			Info: userSession,
		})
		test.Require().NoError(err)

		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+session.Token)

		rr := httptest.NewRecorder()
		permissions := []accounts.Permission{accounts.PermissionCreateRegularUsers}
		test.middleware.Session(test.middleware.RequireSession(handler, permissions)).ServeHTTP(rr, req)

		test.True(handlerCalled)
		test.Equal(http.StatusOK, rr.Code)
	})
}

func (test *MiddlewareTestSuite) TestExtractSessionID() {
	test.Run("With Authorization Bearer", func() {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer session-123")

		sessionID := test.middleware.extractSessionID(req)
		test.Equal("session-123", sessionID)
	})

	test.Run("With Authorization Direct", func() {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "session-456")

		sessionID := test.middleware.extractSessionID(req)
		test.Equal("session-456", sessionID)
	})

	test.Run("With X-Session-ID", func() {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Session-ID", "session-789")

		sessionID := test.middleware.extractSessionID(req)
		test.Equal("session-789", sessionID)
	})

	test.Run("With Authorization and X-Session-ID", func() {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer session-101")
		req.Header.Set("X-Session-ID", "session-102")

		sessionID := test.middleware.extractSessionID(req)
		test.Equal("session-101", sessionID)
	})

	test.Run("With no headers", func() {
		req := httptest.NewRequest("GET", "/test", nil)

		sessionID := test.middleware.extractSessionID(req)
		test.Equal("", sessionID)
	})
}
