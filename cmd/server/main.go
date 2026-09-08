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
	"strings"
	"time"
)

type Config struct{ APIKey, Upstream, UpstreamKey string }

func gatewayHandler(cfg Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok","engine":"SotaRouter"}`)
	})
	mux.HandleFunc("/v1/chat/completions", proxyChat(cfg))
	return mux
}

func proxyChat(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if cfg.APIKey != "" && r.Header.Get("Authorization") != "Bearer "+cfg.APIKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if cfg.Upstream == "" {
			http.Error(w, "upstream not configured", http.StatusServiceUnavailable)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
		if err != nil {
			http.Error(w, "invalid request", 400)
			return
		}
		var payload json.RawMessage
		if json.Unmarshal(body, &payload) != nil {
			http.Error(w, "invalid JSON", 400)
			return
		}
		u, err := url.Parse(strings.TrimRight(cfg.Upstream, "/") + "/v1/chat/completions")
		if err != nil {
			http.Error(w, "invalid upstream", 500)
			return
		}
		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, u.String(), bytes.NewReader(body))
		if err != nil {
			http.Error(w, "upstream request failed", 502)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		if cfg.UpstreamKey != "" {
			req.Header.Set("Authorization", "Bearer "+cfg.UpstreamKey)
		}
		resp, err := (&http.Client{Timeout: 120 * time.Second}).Do(req)
		if err != nil {
			http.Error(w, "upstream unavailable", 502)
			return
		}
		defer resp.Body.Close()
		for k, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(k, value)
			}
		}
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	cfg := Config{APIKey: os.Getenv("SOTA_API_KEY"), Upstream: os.Getenv("SOTA_UPSTREAM_URL"), UpstreamKey: os.Getenv("SOTA_UPSTREAM_KEY")}
	log.Printf("[SotaRouter] gateway listening on :%s", port)
	if err := http.ListenAndServe(":"+port, gatewayHandler(cfg)); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
