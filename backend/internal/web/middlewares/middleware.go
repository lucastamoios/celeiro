package middlewares

import (
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/pkg/logging"
)

type Middleware interface {
	LogError(next http.Handler) http.Handler
	Session(next http.Handler) http.Handler
	RequireSession(next http.HandlerFunc, requiredPermissions []accounts.Permission) http.HandlerFunc

	extractSessionID(r *http.Request) string
	extractActiveOrganization(r *http.Request) int
}

type middleware struct {
	app    *application.Application
	logger logging.Logger
}

func NewMiddleware(app *application.Application, logger logging.Logger) Middleware {
	return &middleware{
		app:    app,
		logger: logger,
	}
}

func (m *middleware) LogError(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Wrap the ResponseWriter to capture errors
		wrappedWriter := &logging.ResponseWriter{ResponseWriter: w}
		next.ServeHTTP(wrappedWriter, r)
		if err := wrappedWriter.GetError(); err != nil {
			m.logger.Error(r.Context(), fmt.Errorf("internal error: %w", err).Error(), "error", err)
		}
	})
}

func (m *middleware) Session(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionID := m.extractSessionID(r)

		if sessionID != "" {
			session, err := m.app.AccountsService.LoadSession(r.Context(), accounts.LoadSessionInput{
				SessionID: sessionID,
			})

			if err == nil {
				activeOrganizationID := m.extractActiveOrganization(r)

				var activeOrganization accounts.OrganizationWithPermissions
				if activeOrganizationID != 0 {
					for _, o := range session.Info.Organizations {
						if o.OrganizationID == activeOrganizationID {
							activeOrganization = o
							break
						}
					}
				}
				if activeOrganization.OrganizationID == 0 {
					activeOrganization = session.Info.Organizations[0]
				}

				ctx := m.app.AccountsService.SetSessionToContext(r.Context(), session)
				ctx = m.app.AccountsService.SetActiveOrganizationToContext(ctx, activeOrganization.OrganizationID)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (m *middleware) RequireSession(next http.HandlerFunc, requiredPermissions []accounts.Permission) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.app.AccountsService.GetSessionFromContext(r.Context())
		if err != nil {
			http.Error(w, "Session required", http.StatusUnauthorized)
			return
		}

		activeOrganization, err := m.app.AccountsService.GetActiveOrganizationFromContext(r.Context())
		if err != nil {
			http.Error(w, "Active organization required", http.StatusUnauthorized)
			return
		}

		var organization accounts.OrganizationWithPermissions
		for _, o := range session.Info.Organizations {
			if o.OrganizationID == activeOrganization {
				organization = o
				break
			}
		}

		if len(requiredPermissions) > 0 && organization.UserRole != accounts.RoleAdmin {
			allowed := true
			for _, p := range requiredPermissions {
				if !slices.Contains(organization.UserPermissions, p) {
					allowed = false
					break
				}
			}

			if !allowed {
				http.Error(w, "Unauthorized", http.StatusForbidden)
				return
			}
		}

		next(w, r)
	})
}

func (m *middleware) extractSessionID(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		if strings.HasPrefix(authHeader, "Bearer ") {
			return strings.TrimPrefix(authHeader, "Bearer ")
		}
		return authHeader
	}

	sessionHeader := r.Header.Get("X-Session-ID")
	if sessionHeader != "" {
		return sessionHeader
	}

	return ""
}

func (m *middleware) extractActiveOrganization(r *http.Request) int {
	organizationHeader := r.Header.Get("X-Active-Organization")
	if organizationHeader != "" {
		organizationID, err := strconv.Atoi(organizationHeader)
		if err != nil {
			return 0
		}
		return organizationID
	}

	return 0
}
