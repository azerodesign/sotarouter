package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"sotarouter/pkg/provider"
)

func TestGatewayHealthAndModels(t *testing.T) {
	dir := t.TempDir()
	pool, err := provider.NewPool(filepath.Join(dir, "providers.json"))
	if err != nil {
		t.Fatalf("failed to init pool: %v", err)
	}

	gw := NewGateway(pool, "test-secret")

	// 1. Health check
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	gw.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// 2. Auth check for completions
	reqComp := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"gpt-4o"}`))
	wComp := httptest.NewRecorder()
	gw.ServeHTTP(wComp, reqComp)

	if wComp.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without auth header, got %d", wComp.Code)
	}

	// 3. Models list
	reqModels := httptest.NewRequest("GET", "/v1/models", nil)
	wModels := httptest.NewRecorder()
	gw.ServeHTTP(wModels, reqModels)

	if wModels.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", wModels.Code)
	}
	var res map[string]interface{}
	if err := json.Unmarshal(wModels.Body.Bytes(), &res); err != nil || res["object"] != "list" {
		t.Fatalf("invalid models response: %v", wModels.Body.String())
	}
}
