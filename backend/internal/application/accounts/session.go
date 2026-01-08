package accounts

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/catrutech/celeiro/pkg/contextual"
	"github.com/catrutech/celeiro/pkg/errors"
)

type AccountsSession interface {
	CreateSession(ctx context.Context, params CreateSessionInput) (Session, error)
	LoadSession(ctx context.Context, params LoadSessionInput) (Session, error)
	GetSessionFromContext(ctx context.Context) (Session, error)
	SetSessionToContext(ctx context.Context, session Session) context.Context
	GetActiveOrganizationFromContext(ctx context.Context) (int, error)
	SetActiveOrganizationToContext(ctx context.Context, organizationID int) context.Context
	UpdateOrganizationInSession(ctx context.Context, params UpdateOrganizationInSessionInput) error

	deleteSession(ctx context.Context, params DeleteSessionInput) error
	refreshSession(ctx context.Context, params RefreshSessionInput) (Session, error)
	getSessionKey(sessionID string) string
}

// CreateSession

type CreateSessionInput struct {
	Info SessionInfo
}

func (s *service) CreateSession(ctx context.Context, params CreateSessionInput) (Session, error) {
	if s.transientDB == nil {
		return Session{}, errors.New("transient database not available")
	}

	sessionToken := s.system.SessionToken.Generate(128)
	now := time.Now()
	expiration := 30 * 24 * time.Hour

	session := Session{
		Token:     sessionToken,
		Info:      params.Info,
		CreatedAt: now,
		ExpiresAt: now.Add(expiration),
	}

	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return Session{}, errors.Wrap(err, "failed to create session for user %s", params.Info.User.Email)
	}

	key := s.getSessionKey(sessionToken)
	if err := s.transientDB.SetWithExpiration(ctx, key, string(sessionJSON), expiration); err != nil {
		return Session{}, errors.Wrap(err, "failed to store session")
	}
	return session, nil
}

// LoadSession

type LoadSessionInput struct {
	SessionID string
}

func (s *service) LoadSession(ctx context.Context, params LoadSessionInput) (Session, error) {
	if s.transientDB == nil {
		return Session{}, errors.New("transient database not available")
	}

	key := s.getSessionKey(params.SessionID)
	sessionJSON, err := s.transientDB.Get(ctx, key)
	if err != nil {
		return Session{}, errors.Wrap(err, "session %s not found or expired", params.SessionID)
	}

	var session Session
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		return Session{}, errors.Wrap(err, "invalid session format")
	}

	if time.Now().After(session.ExpiresAt) {
		err := s.deleteSession(ctx, DeleteSessionInput{SessionID: params.SessionID})
		if err != nil {
			return Session{}, errors.Wrap(err, "failed to delete expired session %s", params.SessionID)
		}
		return Session{}, errors.New("session has expired")
	}

	return session, nil
}

// GetSessionFromContext

func (s *service) GetSessionFromContext(ctx context.Context) (Session, error) {
	session, ok := contextual.GetSession(ctx).(Session)
	if !ok {
		return Session{}, errors.New("session not found")
	}

	return session, nil
}

// SetSessionToContext

func (s *service) SetSessionToContext(ctx context.Context, session Session) context.Context {
	return contextual.SetSession(ctx, session)
}

// GetActiveOrganizationFromContext

func (s *service) GetActiveOrganizationFromContext(ctx context.Context) (int, error) {
	organizationID, ok := contextual.GetActiveOrganization(ctx).(int)
	if !ok {
		return 0, errors.New("active organization not found")
	}

	return organizationID, nil
}

// SetActiveOrganizationToContext

func (s *service) SetActiveOrganizationToContext(ctx context.Context, organizationID int) context.Context {
	return contextual.SetActiveOrganization(ctx, organizationID)
}

// DeleteSession

type DeleteSessionInput struct {
	SessionID string
}

func (s *service) deleteSession(ctx context.Context, params DeleteSessionInput) error {
	if s.transientDB == nil {
		return errors.New("transient database not available")
	}

	key := s.getSessionKey(params.SessionID)
	if err := s.transientDB.Delete(ctx, key); err != nil {
		return errors.Wrap(err, "failed to delete session %s", params.SessionID)
	}

	return nil
}

// RefreshSession

type RefreshSessionInput struct {
	SessionID string
}

func (s *service) refreshSession(ctx context.Context, params RefreshSessionInput) (Session, error) {
	session, err := s.LoadSession(ctx, LoadSessionInput{SessionID: params.SessionID})
	if err != nil {
		return Session{}, err
	}

	expiration := 24 * time.Hour
	session.ExpiresAt = time.Now().Add(expiration)

	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return Session{}, errors.Wrap(err, "failed to refresh session %s", params.SessionID)
	}

	key := s.getSessionKey(params.SessionID)
	if err := s.transientDB.SetWithExpiration(ctx, key, string(sessionJSON), expiration); err != nil {
		return Session{}, errors.Wrap(err, "failed to refresh session %s", params.SessionID)
	}

	return session, nil
}

func (s *service) getSessionKey(sessionID string) string {
	return fmt.Sprintf("session:%s", sessionID)
}

// UpdateOrganizationInSession updates organization data in the user's session stored in Redis
// This is called when organization details (like name) are updated to keep session data fresh

type UpdateOrganizationInSessionInput struct {
	SessionToken   string
	OrganizationID int
	Name           string
}

func (s *service) UpdateOrganizationInSession(ctx context.Context, params UpdateOrganizationInSessionInput) error {
	if s.transientDB == nil {
		return errors.New("transient database not available")
	}

	// Load the current session
	session, err := s.LoadSession(ctx, LoadSessionInput{SessionID: params.SessionToken})
	if err != nil {
		return errors.Wrap(err, "failed to load session for update")
	}

	// Find and update the organization in the session
	for i := range session.Info.Organizations {
		if session.Info.Organizations[i].OrganizationID == params.OrganizationID {
			session.Info.Organizations[i].Name = params.Name
			break
		}
	}

	// Calculate remaining TTL
	remaining := time.Until(session.ExpiresAt)
	if remaining <= 0 {
		return errors.New("session has expired")
	}

	// Save the updated session back to Redis
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return errors.Wrap(err, "failed to marshal updated session")
	}

	key := s.getSessionKey(params.SessionToken)
	if err := s.transientDB.SetWithExpiration(ctx, key, string(sessionJSON), remaining); err != nil {
		return errors.Wrap(err, "failed to save updated session")
	}

	return nil
}
