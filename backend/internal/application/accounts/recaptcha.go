package accounts

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/catrutech/celeiro/pkg/errors"
)

type recaptchaResponse struct {
	Success     bool      `json:"success"`
	Score       float64   `json:"score"`
	Action      string    `json:"action"`
	ChallengeTS time.Time `json:"challenge_ts"`
	Hostname    string    `json:"hostname"`
	ErrorCodes  []string  `json:"error-codes"`
}

// verifyRecaptcha validates a reCAPTCHA v3 token with Google's API.
// Returns an error if the token is invalid or the score is below the threshold.
func (s *service) verifyRecaptcha(token string) error {
	if s.recaptchaSecretKey == "" {
		// reCAPTCHA not configured — skip verification (dev/test environments)
		return nil
	}

	if token == "" {
		return errors.New("recaptcha token is required")
	}

	resp, err := (&http.Client{Timeout: 5 * time.Second}).PostForm(
		"https://www.google.com/recaptcha/api/siteverify",
		url.Values{
			"secret":   {s.recaptchaSecretKey},
			"response": {token},
		},
	)
	if err != nil {
		return errors.Wrap(err, "failed to verify recaptcha")
	}
	defer resp.Body.Close()

	var result recaptchaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "failed to decode recaptcha response")
	}

	if !result.Success {
		return fmt.Errorf("recaptcha verification failed: %v", result.ErrorCodes)
	}

	if result.Score < 0.5 {
		return errors.New("recaptcha score too low")
	}

	return nil
}
