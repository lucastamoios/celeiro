package responses

import (
	"net/http"
	"testing"

	"github.com/catrutech/celeiro/internal/errors"
	"github.com/stretchr/testify/assert"
)

func TestAPIErrorMapping_NewAPIError_WithRecaptchaFailure(t *testing.T) {
	response := newAPIError(errors.ErrRecaptchaFailed)

	assert.Equal(t, http.StatusBadRequest, response.Status)
	assert.Equal(t, "RECAPTCHA_FAILED", response.Code)
	assert.Equal(t, errors.ErrRecaptchaFailed.Error(), response.Message)
}
