package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"
)

//go:embed app/*
var appFS embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Extract sub filesystem for static web UI
	publicFS, err := fs.Sub(appFS, "app")
	if err != nil {
		log.Fatalf("Failed to load embedded filesystem: %v", err)
	}

	mux := http.NewServeMux()

	// 1. Static Web UI Server
	fileServer := http.FileServer(http.FS(publicFS))
	mux.Handle("/", fileServer)

	// 2. Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","engine":"SotaRouter","version":"1.0.0-go","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
	})

	// 3. Unified OpenAI / Anthropic Chat Completions Proxy Mock
	mux.HandleFunc("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		// Mock SSE response
		fmt.Fprintf(w, "data: {\"id\":\"sota-123\",\"object\":\"chat.completion.chunk\",\"created\":%d,\"model\":\"sota-auto-fast\",\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"SotaRouter: Ultra-fast response from Go engine.\"}}]}\n\n", time.Now().Unix())
		flusher.Flush()

		time.Sleep(50 * time.Millisecond)

		fmt.Fprintf(w, "data: [DONE]\n\n")
		flusher.Flush()
	})

	log.Printf("[SotaRouter] Starting server on http://0.0.0.0:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server exited with error: %v", err)
	}
}
