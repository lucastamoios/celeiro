package webhooks

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type forwardingAccountsService struct {
	accounts.Service
	getUserByEmail   func(context.Context, accounts.GetUserByEmailInput) (accounts.User, error)
	getUserByEmailID func(context.Context, accounts.GetUserByEmailIDInput) (accounts.User, error)
}

func (s forwardingAccountsService) GetUserByEmail(
	ctx context.Context,
	input accounts.GetUserByEmailInput,
) (accounts.User, error) {
	return s.getUserByEmail(ctx, input)
}

func (s forwardingAccountsService) GetUserByEmailID(
	ctx context.Context,
	input accounts.GetUserByEmailIDInput,
) (accounts.User, error) {
	return s.getUserByEmailID(ctx, input)
}

func TestWebhookHandler_HandleGmailForwardingVerification_WithRegisteredUser(t *testing.T) {
	var confirmationRequests atomic.Int32

	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch {
		case r.URL.Path == "/emails/receiving/email-123":
			return jsonHTTPResponse(http.StatusOK, `{
				"text": "registered@example.com requested forwarding confirmation https://mail-settings.google.com/mail/vf-test-token"
			}`), nil
		case r.URL.Path == "/mail/vf-test-token":
			confirmationRequests.Add(1)
			return jsonHTTPResponse(http.StatusOK, `{}`), nil
		default:
			return jsonHTTPResponse(http.StatusNotFound, `{}`), nil
		}
	})}

	handler := &Handler{
		app: &application.Application{
			AccountsService: forwardingAccountsService{
				getUserByEmail: func(_ context.Context, input accounts.GetUserByEmailInput) (accounts.User, error) {
					assert.Equal(t, "registered@example.com", input.Email)
					return accounts.User{UserID: 10, Email: input.Email}, nil
				},
				getUserByEmailID: func(_ context.Context, input accounts.GetUserByEmailIDInput) (accounts.User, error) {
					assert.Equal(t, "u-registered", input.EmailID)
					return accounts.User{UserID: 10, EmailID: input.EmailID}, nil
				},
			},
		},
		logger:           &logging.TestLogger{},
		resendAPIKey:     "test-api-key",
		resendAPIBaseURL: "https://resend.test",
		mailDomain:       "laguiar.dev",
		httpClient:       httpClient,
	}
	recorder := httptest.NewRecorder()

	handler.handleGmailForwardingVerification(
		context.Background(),
		ResendInboundEmail{
			EmailID: "email-123",
			To:      []string{"u-registered@laguiar.dev"},
		},
		recorder,
	)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, int32(1), confirmationRequests.Load())

	var response responses.APIResponse[EmailInboundResponse]
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.True(t, response.Data.Success)
	assert.Equal(t, "Gmail forwarding confirmed for registered@example.com", response.Data.Message)
}

func TestWebhookHandler_HandleGmailForwardingVerification_WithUnknownUser(t *testing.T) {
	var confirmationRequests atomic.Int32

	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch {
		case r.URL.Path == "/emails/receiving/email-456":
			return jsonHTTPResponse(http.StatusOK, `{
				"text": "unknown@example.com requested forwarding confirmation https://mail-settings.google.com/mail/vf-test-token"
			}`), nil
		case r.URL.Path == "/mail/vf-test-token":
			confirmationRequests.Add(1)
			return jsonHTTPResponse(http.StatusOK, `{}`), nil
		default:
			return jsonHTTPResponse(http.StatusNotFound, `{}`), nil
		}
	})}

	handler := &Handler{
		app: &application.Application{
			AccountsService: forwardingAccountsService{
				getUserByEmail: func(_ context.Context, input accounts.GetUserByEmailInput) (accounts.User, error) {
					assert.Equal(t, "unknown@example.com", input.Email)
					return accounts.User{}, errors.New("user not found")
				},
			},
		},
		logger:           &logging.TestLogger{},
		resendAPIKey:     "test-api-key",
		resendAPIBaseURL: "https://resend.test",
		httpClient:       httpClient,
	}
	recorder := httptest.NewRecorder()

	handler.handleGmailForwardingVerification(
		context.Background(),
		ResendInboundEmail{EmailID: "email-456"},
		recorder,
	)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, int32(0), confirmationRequests.Load())

	var response responses.APIResponse[EmailInboundResponse]
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.False(t, response.Data.Success)
	assert.Equal(t, "Requester is not a registered user", response.Data.Message)
	assert.NotContains(t, strings.ToLower(recorder.Body.String()), "confirmed")
}

func TestWebhookHandler_HandleGmailForwardingVerification_WhenRequesterDoesNotOwnDestination(t *testing.T) {
	var confirmationRequests atomic.Int32

	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch {
		case r.URL.Path == "/emails/receiving/email-mismatch":
			return jsonHTTPResponse(http.StatusOK, `{
				"text": "requester@example.com requested forwarding confirmation https://mail-settings.google.com/mail/vf-test-token"
			}`), nil
		case r.URL.Path == "/mail/vf-test-token":
			confirmationRequests.Add(1)
			return jsonHTTPResponse(http.StatusOK, `{}`), nil
		default:
			return jsonHTTPResponse(http.StatusNotFound, `{}`), nil
		}
	})}

	handler := &Handler{
		app: &application.Application{
			AccountsService: forwardingAccountsService{
				getUserByEmail: func(_ context.Context, input accounts.GetUserByEmailInput) (accounts.User, error) {
					return accounts.User{UserID: 10, Email: input.Email}, nil
				},
				getUserByEmailID: func(_ context.Context, input accounts.GetUserByEmailIDInput) (accounts.User, error) {
					assert.Equal(t, "u-destination-owner", input.EmailID)
					return accounts.User{UserID: 20, EmailID: input.EmailID}, nil
				},
			},
		},
		logger:           &logging.TestLogger{},
		resendAPIKey:     "test-api-key",
		resendAPIBaseURL: "https://resend.test",
		mailDomain:       "laguiar.dev",
		httpClient:       httpClient,
	}
	recorder := httptest.NewRecorder()

	handler.handleGmailForwardingVerification(
		context.Background(),
		ResendInboundEmail{
			EmailID: "email-mismatch",
			To:      []string{"u-destination-owner@laguiar.dev"},
		},
		recorder,
	)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, int32(0), confirmationRequests.Load())

	var response responses.APIResponse[EmailInboundResponse]
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.False(t, response.Data.Success)
	assert.Equal(t, "Requester does not own destination address", response.Data.Message)
}

func TestWebhookHandler_HandleGmailForwardingVerification_WhenGoogleRejectsConfirmation(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch {
		case r.URL.Path == "/emails/receiving/email-789":
			return jsonHTTPResponse(http.StatusOK, `{
				"text": "registered@example.com requested forwarding confirmation https://mail-settings.google.com/mail/vf-expired-token"
			}`), nil
		case r.URL.Path == "/mail/vf-expired-token":
			return jsonHTTPResponse(http.StatusGone, `{}`), nil
		default:
			return jsonHTTPResponse(http.StatusNotFound, `{}`), nil
		}
	})}

	handler := &Handler{
		app: &application.Application{
			AccountsService: forwardingAccountsService{
				getUserByEmail: func(_ context.Context, input accounts.GetUserByEmailInput) (accounts.User, error) {
					return accounts.User{UserID: 10, Email: input.Email}, nil
				},
				getUserByEmailID: func(_ context.Context, input accounts.GetUserByEmailIDInput) (accounts.User, error) {
					assert.Equal(t, "u-registered", input.EmailID)
					return accounts.User{UserID: 10, EmailID: input.EmailID}, nil
				},
			},
		},
		logger:           &logging.TestLogger{},
		resendAPIKey:     "test-api-key",
		resendAPIBaseURL: "https://resend.test",
		mailDomain:       "laguiar.dev",
		httpClient:       httpClient,
	}
	recorder := httptest.NewRecorder()

	handler.handleGmailForwardingVerification(
		context.Background(),
		ResendInboundEmail{
			EmailID: "email-789",
			To:      []string{"u-registered@laguiar.dev"},
		},
		recorder,
	)

	require.Equal(t, http.StatusOK, recorder.Code)

	var response responses.APIResponse[EmailInboundResponse]
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.False(t, response.Data.Success)
	assert.Equal(t, "Gmail rejected forwarding confirmation", response.Data.Message)
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func jsonHTTPResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     http.StatusText(status),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
