// Package line lets customers order from the shop's LINE Official Account and
// keeps them posted as their order moves.
package line

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultAPIBase = "https://api.line.me"
	requestTimeout = 5 * time.Second
	maxErrorBody   = 512
)

var ErrInvalidToken = errors.New("LINE sign-in could not be verified")

type Identity struct {
	UserID string
	Name   string
}

// Client talks to the LINE Login and Messaging APIs.
type Client struct {
	base      string
	channelID string
	token     string
	http      *http.Client
}

func NewClient(loginChannelID, accessToken string) *Client {
	return &Client{
		base:      defaultAPIBase,
		channelID: loginChannelID,
		token:     accessToken,
		http:      &http.Client{Timeout: requestTimeout},
	}
}

func (c *Client) WithBaseURL(base string) *Client {
	c.base = strings.TrimRight(base, "/")
	return c
}

// Verify asks LINE whether an ID token from the LIFF app is genuine and meant for our channel.
func (c *Client) Verify(ctx context.Context, idToken string) (Identity, error) {
	form := url.Values{"id_token": {idToken}, "client_id": {c.channelID}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/oauth2/v2.1/verify", strings.NewReader(form.Encode()))
	if err != nil {
		return Identity{}, fmt.Errorf("build verify request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return Identity{}, fmt.Errorf("verify id token: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return Identity{}, ErrInvalidToken
	}
	if resp.StatusCode != http.StatusOK {
		return Identity{}, fmt.Errorf("verify id token: %s", describe(resp))
	}

	var body struct {
		Sub  string `json:"sub"`
		Name string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return Identity{}, fmt.Errorf("decode verify response: %w", err)
	}
	if body.Sub == "" {
		return Identity{}, ErrInvalidToken
	}
	return Identity{UserID: body.Sub, Name: body.Name}, nil
}

// Push sends a text message to one user through the shop's Official Account.
func (c *Client) Push(ctx context.Context, to, text string) error {
	payload, err := json.Marshal(map[string]any{
		"to":       to,
		"messages": []map[string]string{{"type": "text", "text": text}},
	})
	if err != nil {
		return fmt.Errorf("encode push message: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/v2/bot/message/push", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build push request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("push message: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("push message: %s", describe(resp))
	}
	return nil
}

func describe(resp *http.Response) string {
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBody))
	return fmt.Sprintf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
}
