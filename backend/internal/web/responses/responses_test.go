package responses

import (
	"database/sql"
	"net/http"
	"testing"

	"github.com/catrutech/celeiro/internal/errors"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	pkgerrors "github.com/catrutech/celeiro/pkg/errors"
	"github.com/stretchr/testify/assert"
)

func TestAPIErrorMapping_NewAPIError_WithRecaptchaFailure(t *testing.T) {
	response := newAPIError(errors.ErrRecaptchaFailed)

	assert.Equal(t, http.StatusBadRequest, response.Status)
	assert.Equal(t, "RECAPTCHA_FAILED", response.Code)
	assert.Equal(t, errors.ErrRecaptchaFailed.Error(), response.Message)
}

func TestAPIErrorMapping_NewAPIError_WithClosedMonthDatabaseGuard(t *testing.T) {
	response := newAPIError(pkgerrors.Wrap(&database.PgDetailedError{
		Message: "month is closed",
		Code:    "P0001",
	}, "failed mutation"))

	assert.Equal(t, http.StatusConflict, response.Status)
	assert.Equal(t, "MONTH_CLOSED", response.Code)
}

func TestAPIErrorMapping_NewAPIError_WithMissingScopedResource(t *testing.T) {
	response := newAPIError(pkgerrors.Wrap(sql.ErrNoRows, "failed to fetch scoped resource"))

	assert.Equal(t, http.StatusNotFound, response.Status)
	assert.Equal(t, "NOT_FOUND", response.Code)
}
