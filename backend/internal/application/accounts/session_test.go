package accounts

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"
)

func TestCreateSession_Success(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)
	system := system.NewSystem()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      localMailer,
		system:      system,
	}

	ctx := context.Background()
	orgName := "Test Organization"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           orgName,
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session, err := service.CreateSession(ctx, CreateSessionInput{
		Info: user,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if session.Token == "" {
		t.Fatal("Expected session to be created")
	}
	if session.Token == "" {
		t.Error("Expected session ID to be generated")
	}
	if session.Info.User.ID != user.User.ID {
		t.Errorf("Expected user ID %d, got %d", user.User.ID, session.Info.User.ID)
	}
	if session.Info.Organizations[0].OrganizationID != user.Organizations[0].OrganizationID {
		t.Errorf("Expected user organizations to be equal")
	}
	if session.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to be set")
	}
	if session.ExpiresAt.IsZero() {
		t.Error("Expected ExpiresAt to be set")
	}

	key := service.getSessionKey(session.Token)
	if !memoryDB.HasKey(key) {
		t.Error("Expected session to be stored in database")
	}
}

func TestCreateSession_Success_NullOrganization(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	config := config.Config{EmailFrom: "test@example.com"}
	logger, err := logging.NewOTelLogger(&config)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	localMailer := mailer.NewLocalMailer(&config, logger)
	system := system.NewSystem()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      localMailer,
		system:      system,
	}

	ctx := context.Background()
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           "Test Organization",
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session, err := service.CreateSession(ctx, CreateSessionInput{
		Info: user,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if session.Token == "" {
		t.Fatal("Expected session to be created")
	}
	if session.Token == "" {
		t.Error("Expected session ID to be generated")
	}
	if session.Info.User.ID != user.User.ID {
		t.Errorf("Expected user ID %d, got %d", user.User.ID, session.Info.User.ID)
	}
	if session.Info.Organizations[0].OrganizationID != user.Organizations[0].OrganizationID {
		t.Errorf("Expected user organizations to be equal")
	}

	key := service.getSessionKey(session.Token)
	if !memoryDB.HasKey(key) {
		t.Error("Expected session to be stored in database")
	}
}

func TestCreateSession_NoDatabase(t *testing.T) {
	service := &service{
		Repository:  nil,
		transientDB: nil,
		mailer:      nil,
	}

	ctx := context.Background()
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           "Test Organization",
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session, err := service.CreateSession(ctx, CreateSessionInput{
		Info: user,
	})

	if err == nil {
		t.Error("Expected error when database is nil")
	}
	if session.Token != "" {
		t.Error("Expected session to be empty when error occurs")
	}
	if !strings.Contains(err.Error(), "transient database not available") {
		t.Errorf("Expected 'transient database not available' error, got %v", err)
	}
}

func TestLoadSession_Success(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"
	orgName := "Test Organization"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           orgName,
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session := Session{
		Token:     sessionID,
		Info:      user,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	sessionJSON, _ := json.Marshal(session)
	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, string(sessionJSON))

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if loadedSession.Token == "" {
		t.Fatal("Expected session to be loaded")
	}
	if loadedSession.Token != sessionID {
		t.Errorf("Expected session ID %s, got %s", sessionID, loadedSession.Token)
	}
	if loadedSession.Info.User.Email != user.User.Email {
		t.Errorf("Expected user email %s, got %s", user.User.Email, loadedSession.Info.User.Email)
	}
	if loadedSession.Info.Organizations[0].OrganizationID != user.Organizations[0].OrganizationID {
		t.Errorf("Expected user organizations to be equal")
	}
}

func TestLoadSession_Success_NullOrganization(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           "Test Organization",
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session := Session{
		Token:     sessionID,
		Info:      user,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	sessionJSON, _ := json.Marshal(session)
	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, string(sessionJSON))

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if loadedSession.Token == "" {
		t.Fatal("Expected session to be loaded")
	}
	if loadedSession.Token != sessionID {
		t.Errorf("Expected session ID %s, got %s", sessionID, loadedSession.Token)
	}
	if loadedSession.Info.User.Email != user.User.Email {
		t.Errorf("Expected user email %s, got %s", user.User.Email, loadedSession.Info.User.Email)
	}
	if loadedSession.Info.Organizations[0].OrganizationID != user.Organizations[0].OrganizationID {
		t.Errorf("Expected user organizations to be equal")
	}
}

func TestLoadSession_NotFound(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "nonexistent-session"

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when session doesn't exist")
	}
	if loadedSession.Token != "" {
		t.Error("Expected session to be nil when not found")
	}
	if !strings.Contains(err.Error(), "session not found or expired") {
		t.Errorf("Expected 'session not found or expired' error, got %v", err)
	}
}

func TestLoadSession_Expired(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "expired-session"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           "Test Organization",
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session := Session{
		Token:     sessionID,
		Info:      user,
		CreatedAt: time.Now().Add(-25 * time.Hour),
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	sessionJSON, _ := json.Marshal(session)
	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, string(sessionJSON))

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when session is expired")
	}
	if loadedSession.Token != "" {
		t.Error("Expected session to be nil when expired")
	}
	if !strings.Contains(err.Error(), "session has expired") {
		t.Errorf("Expected 'session has expired' error, got %v", err)
	}
	if memoryDB.HasKey(key) {
		t.Error("Expected expired session to be deleted")
	}
}

func TestLoadSession_InvalidFormat(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "invalid-session"

	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, "invalid json data")

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when session has invalid format")
	}
	if loadedSession.Token != "" {
		t.Error("Expected session to be nil when format is invalid")
	}
	if !strings.Contains(err.Error(), "invalid session format") {
		t.Errorf("Expected 'invalid session format' error, got %v", err)
	}
}

func TestLoadSession_NoDatabase(t *testing.T) {
	service := &service{
		Repository:  nil,
		transientDB: nil,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"

	loadedSession, err := service.LoadSession(ctx, LoadSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when database is nil")
	}
	if loadedSession.Token != "" {
		t.Error("Expected session to be nil when error occurs")
	}
	if !strings.Contains(err.Error(), "transient database not available") {
		t.Errorf("Expected 'transient database not available' error, got %v", err)
	}
}

func TestDeleteSession_Success(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"

	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, "session data")

	err := service.deleteSession(ctx, DeleteSessionInput{
		SessionID: sessionID,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if memoryDB.HasKey(key) {
		t.Error("Expected session to be deleted from database")
	}
}

func TestDeleteSession_NoDatabase(t *testing.T) {
	service := &service{
		Repository:  nil,
		transientDB: nil,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"

	err := service.deleteSession(ctx, DeleteSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when database is nil")
	}
	if !strings.Contains(err.Error(), "transient database not available") {
		t.Errorf("Expected 'transient database not available' error, got %v", err)
	}
}

func TestRefreshSession_Success(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "session-123"
	orgName := "Test Organization"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           orgName,
				},
				UserRole: RoleAdmin,
			},
		},
	}

	originalExpiry := time.Now().Add(1 * time.Hour)
	session := Session{
		Token:     sessionID,
		Info:      user,
		CreatedAt: time.Now().Add(-23 * time.Hour),
		ExpiresAt: originalExpiry,
	}
	sessionJSON, _ := json.Marshal(session)
	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, string(sessionJSON))

	refreshedSession, err := service.refreshSession(ctx, RefreshSessionInput{
		SessionID: sessionID,
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if refreshedSession.Token == "" {
		t.Fatal("Expected refreshed session to be returned")
	}
	if refreshedSession.Token != sessionID {
		t.Errorf("Expected session ID %s, got %s", sessionID, refreshedSession.Token)
	}
	if !refreshedSession.ExpiresAt.After(originalExpiry) {
		t.Error("Expected refreshed session to have extended expiry time")
	}
	if refreshedSession.Info.User.Email != user.User.Email {
		t.Errorf("Expected user email %s, got %s", user.User.Email, refreshedSession.Info.User.Email)
	}
	if refreshedSession.Info.Organizations[0].OrganizationID != user.Organizations[0].OrganizationID {
		t.Errorf("Expected user organizations to be equal")
	}

	storedData, _ := memoryDB.Get(ctx, key)
	var storedSession Session
	json.Unmarshal([]byte(storedData), &storedSession)
	if !storedSession.ExpiresAt.After(originalExpiry) {
		t.Error("Expected stored session to have extended expiry time")
	}
}

func TestRefreshSession_SessionNotFound(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "nonexistent-session"

	refreshedSession, err := service.refreshSession(ctx, RefreshSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when session doesn't exist")
	}
	if refreshedSession.Token != "" {
		t.Error("Expected refreshed session to be nil when session not found")
	}
	if !strings.Contains(err.Error(), "session not found or expired") {
		t.Errorf("Expected 'session not found or expired' error, got %v", err)
	}
}

func TestRefreshSession_ExpiredSession(t *testing.T) {
	memoryDB := transientdb.NewMemoryTransientDB()
	service := &service{
		Repository:  nil,
		transientDB: memoryDB,
		mailer:      nil,
	}

	ctx := context.Background()
	sessionID := "expired-session"
	user := SessionInfo{
		User: UserForSessionInfo{
			ID:    1,
			Name:  "Test User",
			Email: "test@example.com",
			Phone: 1234567890,
		},
		Organizations: []OrganizationWithPermissions{
			{
				Organization: Organization{
					OrganizationID: 1,
					Name:           "Test Organization",
				},
				UserRole: RoleAdmin,
			},
		},
	}

	session := Session{
		Token:     sessionID,
		Info:      user,
		CreatedAt: time.Now().Add(-25 * time.Hour),
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	sessionJSON, _ := json.Marshal(session)
	key := service.getSessionKey(sessionID)
	memoryDB.SetTestData(key, string(sessionJSON))

	refreshedSession, err := service.refreshSession(ctx, RefreshSessionInput{
		SessionID: sessionID,
	})

	if err == nil {
		t.Error("Expected error when trying to refresh expired session")
	}
	if refreshedSession.Token != "" {
		t.Error("Expected refreshed session to be nil when session is expired")
	}
	if !strings.Contains(err.Error(), "session has expired") {
		t.Errorf("Expected 'session has expired' error, got %v", err)
	}
}

func TestGetSessionKey(t *testing.T) {
	service := &service{}
	sessionID := "test-session-123"

	key := service.getSessionKey(sessionID)

	expected := "session:test-session-123"
	if key != expected {
		t.Errorf("Expected key %s, got %s", expected, key)
	}
}
