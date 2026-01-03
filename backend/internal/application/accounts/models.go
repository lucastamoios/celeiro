package accounts

import (
	"database/sql"
	"time"

	"github.com/lib/pq"
)

type UserModel struct {
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
	UserID    int       `db:"user_id"`

	Name         string         `db:"name"`
	Email        string         `db:"email"`
	Phone        int            `db:"phone"`
	PasswordHash sql.NullString `db:"password_hash"`

	Address   string  `db:"address"`
	City      string  `db:"city"`
	State     string  `db:"state"`
	Zip       string  `db:"zip"`
	Country   string  `db:"country"`
	Latitude  float64 `db:"latitude"`
	Longitude float64 `db:"longitude"`
}

type UsersModel []UserModel

type OrganizationModel struct {
	OrganizationID int    `db:"organization_id"`
	Name           string `db:"name"`

	Address   string  `db:"address"`
	City      string  `db:"city"`
	State     string  `db:"state"`
	Zip       string  `db:"zip"`
	Country   string  `db:"country"`
	Latitude  float64 `db:"latitude"`
	Longitude float64 `db:"longitude"`
}

type UserOrganizationModel struct {
	OrganizationID int  `db:"organization_id"`
	UserID         int  `db:"user_id"`
	UserRole       Role `db:"user_role"`
}

type OrganizationWithPermissionsModel struct {
	OrganizationModel
	UserRole        Role           `db:"user_role"`
	UserPermissions pq.StringArray `db:"user_permissions"`
	IsDefault       bool           `db:"is_default"`
}

type OrganizationInviteModel struct {
	InviteID        int          `db:"invite_id"`
	OrganizationID  int          `db:"organization_id"`
	Email           string       `db:"email"`
	Role            Role         `db:"role"`
	Token           string       `db:"token"`
	InvitedByUserID int          `db:"invited_by_user_id"`
	CreatedAt       time.Time    `db:"created_at"`
	ExpiresAt       time.Time    `db:"expires_at"`
	AcceptedAt      sql.NullTime `db:"accepted_at"`
}

type OrganizationMemberModel struct {
	UserID    int       `db:"user_id"`
	Name      string    `db:"name"`
	Email     string    `db:"email"`
	UserRole  Role      `db:"user_role"`
	IsDefault bool      `db:"is_default"`
	JoinedAt  time.Time `db:"created_at"`
}
