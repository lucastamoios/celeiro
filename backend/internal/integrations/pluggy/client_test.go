package pluggy

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateConnectTokenCachesAPIKey(t *testing.T) {
	var authCalls int32
	var connectTokenCalls int32

	client := &Client{
		baseURL:      "https://api.example.test",
		clientID:     "client-id",
		clientSecret: "client-secret",
		httpClient: &http.Client{
			Timeout: 2 * time.Second,
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				switch r.URL.Path {
				case "/auth":
					atomic.AddInt32(&authCalls, 1)
					require.Equal(t, http.MethodPost, r.Method)
					return jsonResponse(t, http.StatusOK, authResponse{
						APIKey:    "test-api-key",
						ExpiresIn: 3600,
					}), nil
				case "/connect_token":
					atomic.AddInt32(&connectTokenCalls, 1)
					require.Equal(t, "test-api-key", r.Header.Get("X-API-KEY"))
					return jsonResponse(t, http.StatusOK, ConnectToken{
						AccessToken: "connect-token-value",
					}), nil
				default:
					return jsonResponse(t, http.StatusNotFound, map[string]string{"error": "not found"}), nil
				}
			}),
		},
	}

	ctx := context.Background()

	firstToken, err := client.CreateConnectToken(ctx, CreateConnectTokenInput{
		ClientUserID: "celeiro:1:1",
		Language:     "pt",
	})
	require.NoError(t, err)
	assert.Equal(t, "connect-token-value", firstToken.AccessToken)

	secondToken, err := client.CreateConnectToken(ctx, CreateConnectTokenInput{
		ClientUserID: "celeiro:1:1",
		Language:     "pt",
	})
	require.NoError(t, err)
	assert.Equal(t, "connect-token-value", secondToken.AccessToken)

	assert.Equal(t, int32(1), atomic.LoadInt32(&authCalls))
	assert.Equal(t, int32(2), atomic.LoadInt32(&connectTokenCalls))
}

func TestQueryDateRangeDefaultsToCurrentMonth(t *testing.T) {
	now := time.Date(2026, time.March, 11, 12, 0, 0, 0, time.UTC)

	from, to, err := QueryDateRange("", "", now)
	require.NoError(t, err)

	assert.Equal(t, "2026-03-01", from.Format("2006-01-02"))
	assert.Equal(t, "2026-03-31", to.Format("2006-01-02"))
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func jsonResponse(t *testing.T, status int, payload any) *http.Response {
	t.Helper()

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewReader(body)),
	}
}
