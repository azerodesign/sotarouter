package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"sotarouter/pkg/provider"
)

type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Model     string `json:"model"`
	Provider  string `json:"provider"`
	Status    int    `json:"status"`
	LatencyMs int64  `json:"latencyMs"`
	Stream    bool   `json:"stream"`
	Error     string `json:"error,omitempty"`
}

type Telemetry struct {
	mu              sync.RWMutex
	TotalRequests   uint64     `json:"totalRequests"`
	SuccessRequests uint64     `json:"successRequests"`
	ErrorRequests   uint64     `json:"errorRequests"`
	ActiveStreams   int64      `json:"activeStreams"`
	EstimatedTokens uint64     `json:"estimatedTokens"`
	RecentLogs      []LogEntry `json:"recentLogs"`
}

func NewTelemetry() *Telemetry {
	return &Telemetry{
		RecentLogs: make([]LogEntry, 0, 100),
	}
}

func (t *Telemetry) RecordLog(entry LogEntry) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if len(t.RecentLogs) >= 100 {
		t.RecentLogs = t.RecentLogs[1:]
	}
	t.RecentLogs = append(t.RecentLogs, entry)
}

func (t *Telemetry) Snapshot() map[string]interface{} {
	t.mu.RLock()
	defer t.mu.RUnlock()

	logsCopy := make([]LogEntry, len(t.RecentLogs))
	copy(logsCopy, t.RecentLogs)

	return map[string]interface{}{
		"totalRequests":   atomic.LoadUint64(&t.TotalRequests),
		"successRequests": atomic.LoadUint64(&t.SuccessRequests),
		"errorRequests":   atomic.LoadUint64(&t.ErrorRequests),
		"activeStreams":   atomic.LoadInt64(&t.ActiveStreams),
		"estimatedTokens": atomic.LoadUint64(&t.EstimatedTokens),
		"recentLogs":      logsCopy,
	}
}

type Gateway struct {
	pool      *provider.Pool
	authKey   string
	client    *http.Client
	telemetry *Telemetry
}

func NewGateway(pool *provider.Pool, authKey string) *Gateway {
	return &Gateway{
		pool:      pool,
		authKey:   authKey,
		telemetry: NewTelemetry(),
		client: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

type ChatPayload struct {
	Model    string        `json:"model"`
	Stream   bool          `json:"stream"`
	Messages []interface{} `json:"messages,omitempty"`
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Global CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-api-key")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.URL.Path {
	case "/":
		http.Redirect(w, r, "https://app.sota.azero.my.id/dashboard", http.StatusTemporaryRedirect)
		return
	case "/health":
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "ok",
			"engine":    "SotaRouter",
			"version":   "1.1.0",
			"providers": len(g.pool.List()),
		})
		return
	case "/v1/models":
		g.handleModels(w, r)
		return
	case "/v1/chat/completions":
		g.handleChatCompletions(w, r)
		return
	case "/api/providers":
		g.handleProvidersAPI(w, r)
		return
	case "/api/stats":
		g.handleStatsAPI(w, r)
		return
	case "/api/logs":
		g.handleLogsAPI(w, r)
		return
	default:
		http.NotFound(w, r)
	}
}

func (g *Gateway) handleStatsAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	snap := g.telemetry.Snapshot()
	snap["providerCount"] = len(g.pool.List())
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"stats":   snap,
	})
}

func (g *Gateway) handleLogsAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	snap := g.telemetry.Snapshot()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"logs":    snap["recentLogs"],
	})
}

func (g *Gateway) handleModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{
  "object": "list",
  "data": [
    {"id": "gpt-4o", "object": "model", "owned_by": "sotarouter"},
    {"id": "gpt-4o-mini", "object": "model", "owned_by": "sotarouter"},
    {"id": "claude-3-7-sonnet", "object": "model", "owned_by": "sotarouter"},
    {"id": "claude-3-5-sonnet", "object": "model", "owned_by": "sotarouter"},
    {"id": "claude-3-5-haiku", "object": "model", "owned_by": "sotarouter"},
    {"id": "deepseek-chat", "object": "model", "owned_by": "sotarouter"},
    {"id": "deepseek-reasoner", "object": "model", "owned_by": "sotarouter"},
    {"id": "gemini-2.5-pro", "object": "model", "owned_by": "sotarouter"},
    {"id": "gemini-2.5-flash", "object": "model", "owned_by": "sotarouter"},
    {"id": "o1-preview", "object": "model", "owned_by": "sotarouter"},
    {"id": "o3-mini", "object": "model", "owned_by": "sotarouter"}
  ]
}`))
}

func (g *Gateway) buildUpstreamRequest(prv *provider.Provider, model string, bodyBytes []byte, r *http.Request) (*http.Request, error) {
	provName := strings.ToLower(prv.Provider)
	targetBase := prv.BaseURL
	var destURL string
	isAnthropic := provName == "anthropic" || provName == "claude"

	if isAnthropic {
		if targetBase == "" {
			targetBase = "https://api.anthropic.com"
		}
		if !strings.HasSuffix(targetBase, "/v1/messages") {
			destURL = strings.TrimRight(targetBase, "/") + "/v1/messages"
		} else {
			destURL = targetBase
		}
	} else if provName == "gemini" && !strings.Contains(targetBase, "openai") && !strings.HasPrefix(targetBase, "http") {
		targetBase = "https://generativelanguage.googleapis.com"
		destURL = targetBase + "/v1beta/openai/chat/completions"
	} else {
		if targetBase == "" {
			targetBase = "https://api.openai.com"
		}
		if !strings.HasSuffix(targetBase, "/v1/chat/completions") && !strings.HasSuffix(targetBase, "/chat/completions") {
			destURL = strings.TrimRight(targetBase, "/") + "/v1/chat/completions"
		} else {
			destURL = targetBase
		}
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, destURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if isAnthropic {
		if prv.APIKey != "" {
			req.Header.Set("x-api-key", prv.APIKey)
		}
		req.Header.Set("anthropic-version", "2023-06-01")
	} else {
		if prv.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+prv.APIKey)
		}
	}

	return req, nil
}

func (g *Gateway) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	atomic.AddUint64(&g.telemetry.TotalRequests, 1)
	start := time.Now()

	// 1. Authenticate incoming request if gateway key is configured
	if g.authKey != "" {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			token = r.Header.Get("x-api-key")
		}
		if token != g.authKey {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":{"message":"invalid gateway token","type":"auth_error"}}`))
			atomic.AddUint64(&g.telemetry.ErrorRequests, 1)
			return
		}
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, 16<<20))
	if err != nil {
		http.Error(w, `{"error":{"message":"unable to read request body"}}`, http.StatusBadRequest)
		atomic.AddUint64(&g.telemetry.ErrorRequests, 1)
		return
	}

	var chatReq ChatPayload
	if err := json.Unmarshal(bodyBytes, &chatReq); err != nil || chatReq.Model == "" {
		chatReq.Model = "default"
	}

	// Retry loop with failover / pool cooldown
	maxRetries := 3
	var lastErr error
	var chosenProvider *provider.Provider

	for attempt := 0; attempt < maxRetries; attempt++ {
		prv, err := g.pool.NextCandidate(chatReq.Model)
		if err != nil {
			lastErr = err
			break
		}
		chosenProvider = prv

		req, err := g.buildUpstreamRequest(prv, chatReq.Model, bodyBytes, r)
		if err != nil {
			g.pool.MarkCooldown(prv.ID, 30*time.Second, err.Error())
			continue
		}

		resp, err := g.client.Do(req)
		if err != nil {
			g.pool.MarkCooldown(prv.ID, 30*time.Second, err.Error())
			lastErr = err
			continue
		}

		// Check for rate limit or server error to trigger failover
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			respBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			errMsg := fmt.Sprintf("upstream error %d: %s", resp.StatusCode, string(respBytes))
			g.pool.MarkCooldown(prv.ID, 60*time.Second, errMsg)
			lastErr = fmt.Errorf("provider %s failed: %d", prv.Provider, resp.StatusCode)
			continue
		}

		// Success! Pass through headers and stream body
		defer resp.Body.Close()
		g.pool.MarkSuccess(prv.ID)
		atomic.AddUint64(&g.telemetry.SuccessRequests, 1)

		provLabel := prv.Provider
		if prv.Name != "" {
			provLabel = prv.Provider + " (" + prv.Name + ")"
		}

		for k, values := range resp.Header {
			for _, val := range values {
				w.Header().Add(k, val)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Flusher for real-time SSE streaming pass-through
		if chatReq.Stream {
			atomic.AddInt64(&g.telemetry.ActiveStreams, 1)
			defer atomic.AddInt64(&g.telemetry.ActiveStreams, -1)
		}

		bytesCopied := int64(0)
		if flusher, ok := w.(http.Flusher); ok {
			buf := make([]byte, 4096)
			for {
				n, err := resp.Body.Read(buf)
				if n > 0 {
					w.Write(buf[:n])
					bytesCopied += int64(n)
					flusher.Flush()
				}
				if err != nil {
					break
				}
			}
		} else {
			n, _ := io.Copy(w, resp.Body)
			bytesCopied = n
		}

		// Approximate token accounting (4 chars = 1 token estimate)
		tokensEst := uint64(bytesCopied / 4)
		if tokensEst < 10 {
			tokensEst = 10
		}
		atomic.AddUint64(&g.telemetry.EstimatedTokens, tokensEst)

		g.telemetry.RecordLog(LogEntry{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Model:     chatReq.Model,
			Provider:  provLabel,
			Status:    resp.StatusCode,
			LatencyMs: time.Since(start).Milliseconds(),
			Stream:    chatReq.Stream,
		})
		return
	}

	atomic.AddUint64(&g.telemetry.ErrorRequests, 1)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	errMsg := "all upstream providers failed or exhausted"
	if lastErr != nil {
		errMsg = lastErr.Error()
	}

	pName := "unknown"
	if chosenProvider != nil {
		pName = chosenProvider.Provider
	}

	g.telemetry.RecordLog(LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Model:     chatReq.Model,
		Provider:  pName,
		Status:    http.StatusBadGateway,
		LatencyMs: time.Since(start).Milliseconds(),
		Stream:    chatReq.Stream,
		Error:     errMsg,
	})

	fmt.Fprintf(w, `{"error":{"message":%q,"type":"gateway_routing_error"}}`, errMsg)
}

func (g *Gateway) handleProvidersAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method == http.MethodGet {
		list := g.pool.List()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"count":     len(list),
			"providers": list,
		})
		return
	}

	if r.Method == http.MethodPost {
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, 400)
			return
		}

		// Support full 9Router backup export or providerConnections array
		var rawItems []interface{}
		if items, ok := body["providerConnections"].([]interface{}); ok {
			rawItems = items
		} else if items, ok := body["providers"].([]interface{}); ok {
			rawItems = items
		} else if items, ok := body["connections"].([]interface{}); ok {
			rawItems = items
		} else if prov, ok := body["provider"].(string); ok && prov != "" {
			rawItems = []interface{}{body}
		}

		if len(rawItems) > 0 {
			count := 0
			for _, item := range rawItems {
				itemMap, ok := item.(map[string]interface{})
				if !ok {
					continue
				}
				provName, _ := itemMap["provider"].(string)
				if provName == "" {
					continue
				}
				id, _ := itemMap["id"].(string)
				if id == "" {
					id = fmt.Sprintf("prv_%d", time.Now().UnixNano())
				}
				name, _ := itemMap["name"].(string)
				email, _ := itemMap["email"].(string)
				authType, _ := itemMap["authType"].(string)
				priority := 1
				if p, ok := itemMap["priority"].(float64); ok {
					priority = int(p)
				}

				apiKey, _ := itemMap["apiKey"].(string)
				if apiKey == "" {
					apiKey, _ = itemMap["accessToken"].(string)
				}
				baseUrl, _ := itemMap["baseUrl"].(string)

				prv := &provider.Provider{
					ID:       id,
					Provider: provName,
					Name:     name,
					Email:    email,
					AuthType: authType,
					Priority: priority,
					IsActive: true,
					BaseURL:  baseUrl,
					APIKey:   apiKey,
					Data:     itemMap,
				}
				g.pool.Upsert(prv)
				count++
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": fmt.Sprintf("imported %d providers", count),
			})
			return
		}

		var prv provider.Provider
		b, _ := json.Marshal(body)
		if err := json.Unmarshal(b, &prv); err != nil || prv.Provider == "" {
			http.Error(w, `{"error":"provider field required"}`, 400)
			return
		}
		if prv.ID == "" {
			prv.ID = fmt.Sprintf("prv_%d", time.Now().UnixNano())
		}
		prv.IsActive = true
		g.pool.Upsert(&prv)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"provider": prv,
		})
		return
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3300"
	}
	dataFile := os.Getenv("SOTA_DATA_FILE")
	if dataFile == "" {
		home, _ := os.UserHomeDir()
		dataFile = filepath.Join(home, ".sotarouter", "providers.json")
	}
	authKey := os.Getenv("SOTA_GATEWAY_KEY")

	pool, err := provider.NewPool(dataFile)
	if err != nil {
		log.Fatalf("failed to init provider pool: %v", err)
	}

	gateway := NewGateway(pool, authKey)

	log.Printf("[SotaRouter Engine v1.1.0] Live gateway listening on :%s", port)
	log.Printf("[SotaRouter Engine] Provider storage: %s", dataFile)

	if err := http.ListenAndServe(":"+port, gateway); err != nil {
		log.Fatalf("server terminated: %v", err)
	}
}
