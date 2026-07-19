package accounts

import (
	"context"
	"database/sql"
	"strings"
	"testing"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	internalerrors "github.com/catrutech/celeiro/internal/errors"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/system"
	"github.com/stretchr/testify/require"
)

type registrationDatabase struct {
	user UserModel
}

var _ database.Database = (*registrationDatabase)(nil)

func (d *registrationDatabase) Query(_ context.Context, dest any, query string, _ ...any) error {
	switch {
	case strings.Contains(query, "accounts.fetchUserByEmailQuery"):
		if d.user.UserID == 0 {
			return sql.ErrNoRows
		}
		*dest.(*UserModel) = d.user
	case strings.Contains(query, "accounts.insertUserQuery"):
		d.user = UserModel{UserID: 10, Name: "Synthetic User", Email: "synthetic@example.com"}
		*dest.(*UserModel) = d.user
	case strings.Contains(query, "accounts.insertOrganizationQuery"):
		*dest.(*OrganizationModel) = OrganizationModel{OrganizationID: 20, Name: "Finanças de Synthetic User"}
	case strings.Contains(query, "accounts.insertUserOrganizationQuery"):
		*dest.(*UserOrganizationModel) = UserOrganizationModel{UserID: 10, OrganizationID: 20, UserRole: RoleAdmin}
	case strings.Contains(query, "accounts.fetchOrganizationsByUserQuery"):
		*dest.(*[]OrganizationWithPermissionsModel) = []OrganizationWithPermissionsModel{{
			OrganizationModel: OrganizationModel{OrganizationID: 20, Name: "Finanças de Synthetic User"},
			UserRole:          RoleAdmin,
			IsDefault:         true,
		}}
	default:
		return sql.ErrNoRows
	}

	return nil
}

func (d *registrationDatabase) Run(_ context.Context, query string, args ...any) error {
	switch {
	case strings.Contains(query, "accounts.modifyUserPasswordQuery"):
		d.user.PasswordHash = sql.NullString{String: args[1].(string), Valid: true}
	case strings.Contains(query, "accounts.modifyUserEmailVerifiedQuery"):
		d.user.EmailVerifiedAt = sql.NullTime{Time: time.Now().UTC(), Valid: true}
	}
	return nil
}

func (d *registrationDatabase) Tx(ctx context.Context, fn func(context.Context) error) error {
	return fn(ctx)
}

func TestAccountsService_Register_RequiresEmailVerificationBeforeSession(t *testing.T) {
	// Arrange
	logger := &logging.TestLogger{}
	cfg := &config.Config{EmailFrom: "test@example.com", FrontendURL: "http://localhost:51111"}
	localMailer := mailer.NewLocalMailer(cfg, logger)
	require.NoError(t, localMailer.(*mailer.LocalMailer).ClearSentEmails())
	memoryDB := transientdb.NewMemoryTransientDB()
	persistentDB := &registrationDatabase{}
	service := New(NewRepository(persistentDB), memoryDB, localMailer, system.NewSystem(), logger, persistentDB, cfg)

	// Act
	auth, err := service.Register(context.Background(), SelfRegisterInput{
		Name:     "Synthetic User",
		Email:    "synthetic@example.com",
		Password: "valid-password",
	})

	// Assert
	require.NoError(t, err)
	require.Empty(t, auth.Session.Token, "registration must not issue a session before email verification")

	sentEmails, err := localMailer.(*mailer.LocalMailer).GetSentEmails()
	require.NoError(t, err)
	require.Len(t, sentEmails, 1, "registration must send one verification email")
	require.Equal(t, "synthetic@example.com", sentEmails[0].Message.To[0])
}

func TestAccountsService_AuthenticateWithPassword_RejectsUnverifiedEmail(t *testing.T) {
	// Arrange
	service, _, _ := newRegistrationTestService(t)
	_, err := service.Register(context.Background(), SelfRegisterInput{
		Name:     "Synthetic User",
		Email:    "synthetic@example.com",
		Password: "valid-password",
	})
	require.NoError(t, err)

	// Act
	_, err = service.AuthenticateWithPassword(context.Background(), AuthenticateWithPasswordInput{
		Email:    "synthetic@example.com",
		Password: "valid-password",
	})

	// Assert
	require.ErrorIs(t, err, internalerrors.ErrEmailNotVerified)
}

func TestAccountsService_AuthenticateWithMagicCode_VerifiesEmailAndCreatesSession(t *testing.T) {
	// Arrange
	service, localMailer, persistentDB := newRegistrationTestService(t)
	_, err := service.Register(context.Background(), SelfRegisterInput{
		Name:     "Synthetic User",
		Email:    "synthetic@example.com",
		Password: "valid-password",
	})
	require.NoError(t, err)
	sentEmails, err := localMailer.GetSentEmails()
	require.NoError(t, err)
	code := sentEmails[0].Message.Data["Code"].(string)

	// Act
	auth, err := service.AuthenticateWithMagicCode(context.Background(), AuthenticateWithMagicCodeInput{
		Email: "synthetic@example.com",
		Code:  code,
	})

	// Assert
	require.NoError(t, err)
	require.True(t, persistentDB.user.EmailVerifiedAt.Valid)
	require.NotEmpty(t, auth.Session.Token)
}

func newRegistrationTestService(t *testing.T) (Service, *mailer.LocalMailer, *registrationDatabase) {
	t.Helper()
	logger := &logging.TestLogger{}
	cfg := &config.Config{EmailFrom: "test@example.com", FrontendURL: "http://localhost:51111"}
	localMailer := mailer.NewLocalMailer(cfg, logger).(*mailer.LocalMailer)
	require.NoError(t, localMailer.ClearSentEmails())
	persistentDB := &registrationDatabase{}
	service := New(
		NewRepository(persistentDB),
		transientdb.NewMemoryTransientDB(),
		localMailer,
		system.NewSystem(),
		logger,
		persistentDB,
		cfg,
	)
	return service, localMailer, persistentDB
}
