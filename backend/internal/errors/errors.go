package errors

import pkgerrors "github.com/catrutech/celeiro/pkg/errors"

// Common error definitions
var (
	ErrEmailRequired         = pkgerrors.New("email is required")
	ErrEmailFormatInvalid    = pkgerrors.New("email format is invalid")
	ErrCodeRequired          = pkgerrors.New("code is required")
	ErrCodeFormatInvalid     = pkgerrors.New("code must be 4 digits")
	ErrInvalidJSONSyntax     = pkgerrors.New("invalid JSON syntax")
	ErrInvalidJSONType       = pkgerrors.New("invalid JSON type")
	ErrUnauthorized          = pkgerrors.New("unauthorized")
	ErrMissingRequiredFields = pkgerrors.New("missing required fields")
	ErrInvalidFormat         = pkgerrors.New("invalid format")
	ErrInvalidSession        = pkgerrors.New("invalid session")
	ErrActivationFailed      = pkgerrors.New("activation failed")
	ErrInvalidCode           = pkgerrors.New("invalid code")
	ErrInvalidRequestBody    = pkgerrors.New("invalid request body")
	ErrInvalidCredentials    = pkgerrors.New("invalid credentials")
)

func NewInvalidTimeFormatError(field string) error {
	return pkgerrors.Wrap(ErrInvalidFormat, "invalid %s format", field)
}

func NewErrActivationFailed(msg string) error {
	return pkgerrors.Wrap(ErrActivationFailed, "%s", msg)
}
