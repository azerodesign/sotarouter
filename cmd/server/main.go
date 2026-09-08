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
	"time"

	"sotarouter/pkg/provider"
)

type Gateway struct {
	pool      *provider.Pool
	authKey   string
	client    *http.Client
}

func NewGateway(pool *provider.Pool, authKey string) *Gateway {
	return &Gateway{
		pool:    pool,
		authKey: authKey,
		client: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

type ChatPayload struct {
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-api-key")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.URL.Path {
	case "/health":
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok","engine":"SotaRouter","version":"1.0.0"}`)
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
	default:
		http.NotFound(w, r)
	}
}

func (g *Gateway) handleModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{
		"object": "list",
		"data": [
			{"id": "gpt-4o", "object": "model", "owned_by": "sotarouter"},
			{"id": "gpt-4o-mini", "object": "model", "owned_by": "sotarouter"},
			{"id": "claude-3-5-sonnet-20241022", "object": "model", "owned_by": "sotarouter"},
			{"id": "gemini-1.5-flash", "object": "model", "owned_by": "sotarouter"},
			{"id": "gemini-1.5-pro", "object": "model", "owned_by": "sotarouter"}
		]
	}`))
}

func (g *Gateway) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":{"message":"method not allowed"}}`, http.StatusMethodNotAllowed)
		return
	}

	// Gateway Auth (optional if SOTA_GATEWAY_KEY is set)
	if g.authKey != "" {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			token = r.Header.Get("x-api-key")
		}
		if token != g.authKey {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":{"message":"invalid gateway token","type":"auth_error"}}`))
			return
		}
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, 16<<20))
	if err != nil {
		http.Error(w, `{"error":{"message":"unable to read request body"}}`, http.StatusBadRequest)
		return
	}

	var chatReq ChatPayload
	if err := json.Unmarshal(bodyBytes, &chatReq); err != nil || chatReq.Model == "" {
		chatReq.Model = "default"
	}

	// Retry loop with failover / pool cooldown
	maxRetries := 3
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		prv, err := g.pool.NextCandidate(chatReq.Model)
		if err != nil {
			lastErr = err
			break
		}

		targetBase := prv.BaseURL
		if targetBase == "" {
			targetBase = "https://api.openai.com"
		}
		destURL := strings.TrimRight(targetBase, "/") + "/v1/chat/completions"

		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, destURL, bytes.NewReader(bodyBytes))
		if err != nil {
			g.pool.MarkCooldown(prv.ID, 30*time.Second, err.Error())
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		if prv.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+prv.APIKey)
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

		for k, values := range resp.Header {
			for _, val := range values {
				w.Header().Add(k, val)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Flusher for real-time SSE streaming pass-through
		if flusher, ok := w.(http.Flusher); ok {
			buf := make([]byte, 4096)
			for {
				n, err := resp.Body.Read(buf)
				if n > 0 {
					w.Write(buf[:n])
					flusher.Flush()
				}
				if err != nil {
					break
				}
			}
		} else {
			io.Copy(w, resp.Body)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	errMsg := "all upstream providers failed or exhausted"
	if lastErr != nil {
		errMsg = lastErr.Error()
	}
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

		// 1. Support full 9Router backup export or providerConnections array
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

				// Extract API key and BaseURL
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
				"message": fmt.Sprintf("imported %d providers from 9Router backup/export", count),
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

	log.Printf("[SotaRouter Engine] Live gateway listening on :%s", port)
	log.Printf("[SotaRouter Engine] Provider storage: %s", dataFile)

	if err := http.ListenAndServe(":"+port, gateway); err != nil {
		log.Fatalf("server terminated: %v", err)
	}
}
