package xint

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Peer string

const (
	PeerPlacement Peer = "placement"
	PeerProjex    Peer = "projex"
	PeerShipx     Peer = "shipx"
)

type Client struct {
	cfg        Config
	sourceApp  string
	httpClient *http.Client
}

func NewClient(cfg Config, sourceApp string) *Client {
	return &Client{
		cfg:       cfg,
		sourceApp: sourceApp,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *Client) DoJSON(
	ctx context.Context,
	peer Peer,
	method, path string,
	payload any,
	dest any,
) error {
	baseURL := c.baseURL(peer)
	if baseURL == "" {
		return fmt.Errorf("xint base url is not configured for peer %q", peer)
	}
	if c.cfg.ServiceToken == "" {
		return fmt.Errorf("xint service token is not configured")
	}

	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(baseURL, "/")+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("X-Xint-Token", c.cfg.ServiceToken)
	req.Header.Set("X-Xint-Source", c.sourceApp)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("xint peer %q returned %d: %s", peer, resp.StatusCode, string(respBody))
	}
	if dest == nil || len(respBody) == 0 {
		return nil
	}
	return json.Unmarshal(respBody, dest)
}

func (c *Client) baseURL(peer Peer) string {
	switch peer {
	case PeerPlacement:
		return c.cfg.PlacementURL
	case PeerProjex:
		return c.cfg.ProjexURL
	case PeerShipx:
		return c.cfg.ShipxURL
	default:
		return ""
	}
}
