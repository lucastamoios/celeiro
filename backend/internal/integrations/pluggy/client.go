package pluggy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/catrutech/celeiro/internal/config"
)

const defaultHTTPTimeout = 15 * time.Second

type Client struct {
	baseURL      string
	clientID     string
	clientSecret string
	httpClient   *http.Client

	mu           sync.Mutex
	apiKey       string
	apiKeyExpiry time.Time
}

type authRequest struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

type authResponse struct {
	APIKey    string `json:"apiKey"`
	ExpiresIn int    `json:"expiresIn"`
}

type CreateConnectTokenInput struct {
	ClientUserID   string `json:"clientUserId"`
	Language       string `json:"language,omitempty"`
	IncludeSandbox bool   `json:"includeSandbox,omitempty"`
}

type ConnectToken struct {
	AccessToken string `json:"accessToken"`
}

func New(cfg *config.Config) *Client {
	return &Client{
		baseURL:      strings.TrimRight(cfg.Pluggy.BaseURL, "/"),
		clientID:     cfg.Pluggy.ClientID,
		clientSecret: cfg.Pluggy.ClientSecret,
		httpClient: &http.Client{
			Timeout: defaultHTTPTimeout,
		},
	}
}

func (c *Client) IsConfigured() bool {
	return c.clientID != "" && c.clientSecret != ""
}

func (c *Client) CreateConnectToken(ctx context.Context, input CreateConnectTokenInput) (ConnectToken, error) {
	if input.ClientUserID == "" {
		return ConnectToken{}, fmt.Errorf("client user id is required")
	}

	body := map[string]any{
		"clientUserId": input.ClientUserID,
	}
	if input.Language != "" {
		body["language"] = input.Language
	}
	if input.IncludeSandbox {
		body["includeSandbox"] = true
	}

	var resp ConnectToken
	if err := c.doJSON(ctx, http.MethodPost, "/connect_token", nil, body, &resp); err != nil {
		return ConnectToken{}, err
	}

	return resp, nil
}

func (c *Client) ListConnectors(ctx context.Context) (map[string]any, error) {
	var resp map[string]any
	if err := c.doJSON(ctx, http.MethodGet, "/connectors", nil, nil, &resp); err != nil {
		return nil, err
	}

	return resp, nil
}

func (c *Client) ListAccountsByItem(ctx context.Context, itemID string) (map[string]any, error) {
	query := url.Values{}
	query.Set("itemId", itemID)

	var resp map[string]any
	if err := c.doJSON(ctx, http.MethodGet, "/accounts", query, nil, &resp); err != nil {
		return nil, err
	}

	return resp, nil
}

func (c *Client) ListTransactionsByAccount(ctx context.Context, accountID string, from, to time.Time) (map[string]any, error) {
	query := url.Values{}
	query.Set("accountId", accountID)
	query.Set("from", from.Format("2006-01-02"))
	query.Set("to", to.Format("2006-01-02"))
	query.Set("pageSize", "500")

	var resp map[string]any
	if err := c.doJSON(ctx, http.MethodGet, "/transactions", query, nil, &resp); err != nil {
		return nil, err
	}

	return resp, nil
}

func (c *Client) doJSON(ctx context.Context, method, path string, query url.Values, body any, out any) error {
	if !c.IsConfigured() {
		return fmt.Errorf("pluggy credentials are not configured")
	}

	apiKey, err := c.getAPIKey(ctx)
	if err != nil {
		return err
	}

	var bodyReader *bytes.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal pluggy request body: %w", err)
		}
		bodyReader = bytes.NewReader(payload)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	requestURL := c.baseURL + path
	if len(query) > 0 {
		requestURL += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, requestURL, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create pluggy request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-KEY", apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("pluggy request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		var apiErr map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&apiErr); err == nil {
			return fmt.Errorf("pluggy request failed with status %d: %v", resp.StatusCode, apiErr)
		}
		return fmt.Errorf("pluggy request failed with status %d", resp.StatusCode)
	}

	if out == nil {
		return nil
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("failed to decode pluggy response: %w", err)
	}

	return nil
}

func (c *Client) getAPIKey(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.apiKey != "" && time.Now().Before(c.apiKeyExpiry) {
		return c.apiKey, nil
	}

	payload, err := json.Marshal(authRequest{
		ClientID:     c.clientID,
		ClientSecret: c.clientSecret,
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal pluggy auth payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/auth", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("failed to create pluggy auth request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("pluggy auth request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		var apiErr map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&apiErr); err == nil {
			return "", fmt.Errorf("pluggy auth failed with status %d: %v", resp.StatusCode, apiErr)
		}
		return "", fmt.Errorf("pluggy auth failed with status %d", resp.StatusCode)
	}

	var authResp authResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", fmt.Errorf("failed to decode pluggy auth response: %w", err)
	}

	if authResp.APIKey == "" {
		return "", fmt.Errorf("pluggy auth response did not include apiKey")
	}

	expiresIn := authResp.ExpiresIn
	if expiresIn <= 0 {
		expiresIn = 1800
	}

	c.apiKey = authResp.APIKey
	c.apiKeyExpiry = time.Now().Add(time.Duration(expiresIn-60) * time.Second)
	if expiresIn <= 60 {
		c.apiKeyExpiry = time.Now().Add(time.Duration(expiresIn) * time.Second)
	}

	return c.apiKey, nil
}

func normalizeMonthBoundary(value string, fallback time.Time) (time.Time, error) {
	if value == "" {
		return fallback, nil
	}

	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date %q, expected YYYY-MM-DD", value)
	}

	return parsed, nil
}

func monthRange(now time.Time) (time.Time, time.Time) {
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, -1)
	return start, end
}

func QueryDateRange(rawFrom, rawTo string, now time.Time) (time.Time, time.Time, error) {
	defaultFrom, defaultTo := monthRange(now)

	from, err := normalizeMonthBoundary(rawFrom, defaultFrom)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	to, err := normalizeMonthBoundary(rawTo, defaultTo)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	if from.After(to) {
		return time.Time{}, time.Time{}, fmt.Errorf("from date %s must be before to date %s", from.Format("2006-01-02"), to.Format("2006-01-02"))
	}

	return from, to, nil
}

func ParsePageSize(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}
