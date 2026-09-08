package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGatewayRejectsMissingAPIKey(t *testing.T) {
	h := gatewayHandler(Config{APIKey: "client-secret", Upstream: "http://127.0.0.1:1"})
	r := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test"}`))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d", w.Code)
	}
}

func TestGatewayProxiesJSONRequest(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer upstream-secret" {
			t.Fatal("missing upstream auth")
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"id":"ok","choices":[]}`)
	}))
	defer upstream.Close()
	h := gatewayHandler(Config{APIKey: "client-secret", Upstream: upstream.URL, UpstreamKey: "upstream-secret"})
	r := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test"}`))
	r.Header.Set("Authorization", "Bearer client-secret")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"id":"ok"`) {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}
