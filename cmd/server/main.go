package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"sotarouter/pkg/provider"
)

func getGoogleCredentials() (string, string) {
	cid := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
	csec := os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
	if cid != "" && csec != "" {
		return cid, csec
	}
	home, _ := os.UserHomeDir()
	oauthPath := filepath.Join(home, ".sotarouter", "google-oauth.json")
	if data, err := os.ReadFile(oauthPath); err == nil {
		var cfg struct {
			ClientID     string `json:"clientId"`
			ClientSecret string `json:"clientSecret"`
		}
		if json.Unmarshal(data, &cfg) == nil && cfg.ClientID != "" {
			return cfg.ClientID, cfg.ClientSecret
		}
	}
	return "", ""
}

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

func (g *Gateway) getAntigravityToken(prv *provider.Provider) (string, string, error) {
	var subdata map[string]interface{}
	if prv.Data != nil {
		if s, ok := prv.Data["data"].(map[string]interface{}); ok {
			subdata = s
		} else {
			subdata = prv.Data
		}
	}
	if subdata == nil {
		return prv.APIKey, "", nil
	}

	projectId, _ := subdata["projectId"].(string)
	refToken, _ := subdata["refreshToken"].(string)
	currentAccess, _ := subdata["accessToken"].(string)

	if refToken != "" {
		cid, csec := getGoogleCredentials()
		// Proactively refresh OAuth token from Google
		data := url.Values{}
		data.Set("grant_type", "refresh_token")
		data.Set("client_id", cid)
		data.Set("client_secret", csec)
		data.Set("refresh_token", refToken)

		resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			var tokenResp struct {
				AccessToken string `json:"access_token"`
			}
			if json.NewDecoder(resp.Body).Decode(&tokenResp) == nil && tokenResp.AccessToken != "" {
				prv.APIKey = tokenResp.AccessToken
				subdata["accessToken"] = tokenResp.AccessToken
				g.pool.Upsert(prv)
				return tokenResp.AccessToken, projectId, nil
			}
		}
	}

	if currentAccess != "" {
		return currentAccess, projectId, nil
	}
	return prv.APIKey, projectId, nil
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

type ModelItem struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}

type ModelListResponse struct {
	Object string      `json:"object"`
	Data   []ModelItem `json:"data"`
}

func (g *Gateway) handleModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	provs := g.pool.List()
	modelMap := make(map[string]string) // modelID -> provider owner

	for _, p := range provs {
		if !p.IsActive {
			continue
		}
		pName := strings.ToLower(p.Provider)

		// 1. Add modelLocks
		for _, m := range p.ModelLocks {
			clean := strings.TrimPrefix(m, "modelLock_")
			if clean != "" {
				modelMap[clean] = pName
			}
		}

		// 2. Add provider standard models
		switch pName {
		case "antigravity":
			for _, m := range []string{
				"gemini-3.8-flash-high", "gemini-3.7-flash-high", "gemini-3.6-flash-high",
				"claude-sonnet-4-6", "claude-opus-4-6-thinking", "gpt-oss-120b-medium",
			} {
				modelMap["ag/"+m] = "antigravity"
			}
		case "codex", "openai":
			for _, m := range []string{
				"gpt-4o", "gpt-4o-mini", "o1-preview", "o3-mini", "gpt-4-turbo",
			} {
				modelMap[m] = "codex"
			}
		case "anthropic", "claude":
			for _, m := range []string{
				"claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku",
			} {
				modelMap[m] = "anthropic"
			}
		case "deepseek":
			for _, m := range []string{
				"deepseek-chat", "deepseek-reasoner",
			} {
				modelMap[m] = "deepseek"
			}
		case "groq":
			for _, m := range []string{
				"llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768",
			} {
				modelMap[m] = "groq"
			}
		case "gemini":
			for _, m := range []string{
				"gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash",
			} {
				modelMap[m] = "gemini"
			}
		}
	}

	var data []ModelItem
	now := time.Now().Unix()
	for id, owner := range modelMap {
		data = append(data, ModelItem{
			ID:      id,
			Object:  "model",
			Created: now,
			OwnedBy: owner,
		})
	}

	json.NewEncoder(w).Encode(ModelListResponse{
		Object: "list",
		Data:   data,
	})
}

func (g *Gateway) buildUpstreamRequest(prv *provider.Provider, model string, bodyBytes []byte, chatReq *ChatPayload, r *http.Request) (*http.Request, error) {
	provName := strings.ToLower(prv.Provider)
	rawModel := strings.TrimPrefix(model, "ag/")

	// 1. Antigravity OAuth integration (Google Cloud CodeAssist)
	if provName == "antigravity" || strings.HasPrefix(model, "ag/") {
		token, projId, err := g.getAntigravityToken(prv)
		if err != nil {
			return nil, err
		}
		destURL := "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent"

		var contents []map[string]interface{}
		for _, msg := range chatReq.Messages {
			msgMap, ok := msg.(map[string]interface{})
			if !ok {
				continue
			}
			role, _ := msgMap["role"].(string)
			if role == "assistant" {
				role = "model"
			} else if role != "model" {
				role = "user"
			}
			contentStr, _ := msgMap["content"].(string)
			contents = append(contents, map[string]interface{}{
				"role": role,
				"parts": []map[string]interface{}{
					{"text": contentStr},
				},
			})
		}
		if len(contents) == 0 {
			contents = append(contents, map[string]interface{}{
				"role": "user",
				"parts": []map[string]interface{}{
					{"text": "Hello"},
				},
			})
		}

		agBody := map[string]interface{}{
			"project":   projId,
			"model":     rawModel,
			"userAgent": "antigravity",
			"request": map[string]interface{}{
				"contents": contents,
			},
		}
		agBytes, _ := json.Marshal(agBody)

		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, destURL, bytes.NewReader(agBytes))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("User-Agent", "antigravity/ide/2.11.0 darwin/arm64")
		return req, nil
	}

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

	key := prv.APIKey
	if key == "" && prv.Data != nil {
		if k, ok := prv.Data["apiKey"].(string); ok && k != "" {
			key = k
		} else if k, ok := prv.Data["accessToken"].(string); ok && k != "" {
			key = k
		} else if sub, ok := prv.Data["data"].(map[string]interface{}); ok {
			if k, ok := sub["accessToken"].(string); ok && k != "" {
				key = k
			} else if k, ok := sub["apiKey"].(string); ok && k != "" {
				key = k
			}
		}
	}

	req.Header.Set("Content-Type", "application/json")
	if isAnthropic {
		if key != "" {
			req.Header.Set("x-api-key", key)
		}
		req.Header.Set("anthropic-version", "2023-06-01")
	} else {
		if key != "" {
			req.Header.Set("Authorization", "Bearer "+key)
		}
		if provName == "codex" {
			req.Header.Set("User-Agent", "codex_cli_rs/0.136.0")
			req.Header.Set("originator", "codex_cli_rs")
			req.Header.Set("session_id", "default")
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
	maxRetries := 5
	var lastErr error
	var chosenProvider *provider.Provider

	for attempt := 0; attempt < maxRetries; attempt++ {
		prv, err := g.pool.NextCandidate(chatReq.Model)
		if err != nil {
			lastErr = err
			break
		}
		chosenProvider = prv

		req, err := g.buildUpstreamRequest(prv, chatReq.Model, bodyBytes, &chatReq, r)
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

		// Check for auth error, rate limit or server error to trigger failover
		if resp.StatusCode == 401 || resp.StatusCode == 403 || resp.StatusCode == 429 || resp.StatusCode >= 500 {
			respBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			errMsg := fmt.Sprintf("upstream error %d: %s", resp.StatusCode, string(respBytes))

			cooldownTime := 20 * time.Second
			if resp.StatusCode == 429 {
				cooldownTime = 15 * time.Second
			} else if resp.StatusCode == 401 || resp.StatusCode == 403 {
				cooldownTime = 90 * time.Second
			}

			g.pool.MarkCooldown(prv.ID, cooldownTime, errMsg)
			lastErr = fmt.Errorf("provider %s failed: %d (%s)", prv.Provider, resp.StatusCode, string(respBytes))
			time.Sleep(250 * time.Millisecond)
			continue
		}

		// Handle Antigravity specific response format conversion
		if strings.ToLower(prv.Provider) == "antigravity" || strings.HasPrefix(chatReq.Model, "ag/") {
			defer resp.Body.Close()
			g.pool.MarkSuccess(prv.ID)
			atomic.AddUint64(&g.telemetry.SuccessRequests, 1)

			respBytes, _ := io.ReadAll(resp.Body)
			var agResp struct {
				Response struct {
					Candidates []struct {
						Content struct {
							Parts []struct {
								Text string `json:"text"`
							} `json:"parts"`
						} `json:"content"`
					} `json:"candidates"`
				} `json:"response"`
			}
			_ = json.Unmarshal(respBytes, &agResp)

			extractedText := ""
			if len(agResp.Response.Candidates) > 0 {
				for _, part := range agResp.Response.Candidates[0].Content.Parts {
					extractedText += part.Text
				}
			}
			if extractedText == "" {
				extractedText = "OK"
			}

			openAIResp := map[string]interface{}{
				"id":      fmt.Sprintf("chatcmpl-ag-%d", time.Now().UnixNano()),
				"object":  "chat.completion",
				"created": time.Now().Unix(),
				"model":   chatReq.Model,
				"choices": []map[string]interface{}{
					{
						"index": 0,
						"message": map[string]interface{}{
							"role":    "assistant",
							"content": extractedText,
						},
						"finish_reason": "stop",
					},
				},
				"usage": map[string]interface{}{
					"prompt_tokens":     12,
					"completion_tokens": len(extractedText) / 4,
					"total_tokens":      12 + len(extractedText)/4,
				},
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(openAIResp)

			provLabel := prv.Provider
			if prv.Name != "" {
				provLabel = prv.Provider + " (" + prv.Name + ")"
			}
			g.telemetry.RecordLog(LogEntry{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				Model:     chatReq.Model,
				Provider:  provLabel,
				Status:    http.StatusOK,
				LatencyMs: time.Since(start).Milliseconds(),
				Stream:    chatReq.Stream,
			})
			return
		}

		// Standard OpenAI/Anthropic pass-through
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
	w.WriteHeader(http.StatusServiceUnavailable)
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
		Status:    http.StatusServiceUnavailable,
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

	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, `{"error":"id parameter required"}`, 400)
			return
		}
		if err := g.pool.Delete(id); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), 500)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"deleted": id,
		})
		return
	}

	if r.Method == http.MethodPost {
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, 400)
			return
		}

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
