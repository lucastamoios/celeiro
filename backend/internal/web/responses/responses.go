package responses

import (
	"encoding/json"
	"github.com/catrutech/celeiro/pkg/logging"
	"net/http"

	"github.com/catrutech/celeiro/internal/errors"
	pkgerrors "github.com/catrutech/celeiro/pkg/errors"
)

type APIResponse[T any] struct {
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
	Status  int    `json:"status"`
	Error   error  `json:"-"`
	Data    T      `json:"data,omitempty"`
}

// ErrorMapping defines how errors map to HTTP responses
type ErrorMapping struct {
	Status int
	Code   string
}

// errorMappings maps specific error values to their HTTP responses
var errorMappings = map[error]ErrorMapping{
	errors.ErrEmailRequired:                  {Status: http.StatusBadRequest, Code: "EMAIL_REQUIRED"},
	errors.ErrEmailFormatInvalid:             {Status: http.StatusBadRequest, Code: "EMAIL_FORMAT_INVALID"},
	errors.ErrCodeRequired:                   {Status: http.StatusBadRequest, Code: "CODE_REQUIRED"},
	errors.ErrCodeFormatInvalid:              {Status: http.StatusBadRequest, Code: "CODE_FORMAT_INVALID"},
	errors.ErrInvalidJSONSyntax:              {Status: http.StatusBadRequest, Code: "INVALID_JSON_SYNTAX"},
	errors.ErrInvalidJSONType:                {Status: http.StatusBadRequest, Code: "INVALID_JSON_TYPE"},
	errors.ErrUnauthorized:                   {Status: http.StatusUnauthorized, Code: "UNAUTHORIZED"},
	errors.ErrMissingRequiredFields:          {Status: http.StatusBadRequest, Code: "MISSING_REQUIRED_FIELDS"},
	errors.ErrInvalidFormat:                  {Status: http.StatusBadRequest, Code: "INVALID_FORMAT"},
	errors.ErrInvalidSession:                 {Status: http.StatusUnauthorized, Code: "INVALID_SESSION"},
	errors.ErrActivationFailed:               {Status: http.StatusUnauthorized, Code: "ACTIVATION_FAILED"},
	errors.ErrInvalidCode:                    {Status: http.StatusUnauthorized, Code: "INVALID_CODE"},
	errors.ErrTransactionCategoryRequired:    {Status: http.StatusBadRequest, Code: "TRANSACTION_CATEGORY_REQUIRED"},
	errors.ErrTransactionDescriptionRequired: {Status: http.StatusBadRequest, Code: "TRANSACTION_DESCRIPTION_REQUIRED"},
}

func NewSuccess[T any](data T, w http.ResponseWriter, status ...int) {
	statusCode := http.StatusOK
	if len(status) > 0 {
		statusCode = status[0]
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	jsonData, err := json.Marshal(APIResponse[T]{
		Status: statusCode,
		Data:   data,
	})
	if err != nil {
		panic(pkgerrors.Wrap(err, "failed to marshal response"))
	}
	w.Write(jsonData)
}

func NewError(w http.ResponseWriter, err error) {
	apiErr := newAPIError(err)

	// This error will be logged in the middleware
	if rw, ok := w.(*logging.ResponseWriter); ok {
		var e *pkgerrors.BaseError
		if pkgerrors.As(err, &e) {
			rw.SetError(e)
		} else {
			rw.SetError(pkgerrors.Wrap(err, "error raised by handler").(*pkgerrors.BaseError))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(apiErr.Status)
	if jsonErr := json.NewEncoder(w).Encode(apiErr); jsonErr != nil {
		panic(pkgerrors.Wrap(jsonErr, "failed to encode error response"))
	}
}

func newAPIError(err error) APIResponse[any] {
	// Check direct error mapping first
	if mapping, exists := errorMappings[err]; exists {
		return APIResponse[any]{
			Message: err.Error(),
			Status:  mapping.Status,
			Code:    mapping.Code,
			Error:   err,
		}
	}

	// Check for wrapped errors using errors.Is
	for baseErr, mapping := range errorMappings {
		if pkgerrors.Is(err, baseErr) {
			return APIResponse[any]{
				Message: err.Error(),
				Status:  mapping.Status,
				Code:    mapping.Code,
				Error:   err,
			}
		}
	}

	// Check for JSON errors using errors.As (no reflection!)
	var syntaxErr *json.SyntaxError
	if pkgerrors.As(err, &syntaxErr) {
		return APIResponse[any]{
			Message: errors.ErrInvalidJSONSyntax.Error(),
			Status:  http.StatusBadRequest,
			Code:    "INVALID_JSON_SYNTAX",
			Error:   err,
		}
	}

	var typeErr *json.UnmarshalTypeError
	if pkgerrors.As(err, &typeErr) {
		return APIResponse[any]{
			Message: errors.ErrInvalidJSONType.Error(),
			Status:  http.StatusBadRequest,
			Code:    "INVALID_JSON_TYPE",
			Error:   err,
		}
	}

	// Default to internal server error
	return APIResponse[any]{
		Message: "An unexpected error occurred",
		Status:  http.StatusInternalServerError,
		Code:    "INTERNAL_SERVER_ERROR",
		Error:   err,
	}
}
