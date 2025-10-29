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
