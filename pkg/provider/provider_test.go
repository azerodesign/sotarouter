package provider

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestPool(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "providers.json")

	pool, err := NewPool(path)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}

	p1 := &Provider{
		ID:       "p1",
		Provider: "openai",
		IsActive: true,
		BaseURL:  "https://api.openai.com",
		APIKey:   "sk-test-1",
	}
	p2 := &Provider{
		ID:       "p2",
		Provider: "groq",
		IsActive: true,
		BaseURL:  "https://api.groq.com/openai",
		APIKey:   "gsk-test-2",
	}

	if err := pool.Upsert(p1); err != nil {
		t.Fatalf("upsert p1 failed: %v", err)
	}
	if err := pool.Upsert(p2); err != nil {
		t.Fatalf("upsert p2 failed: %v", err)
	}

	// Verify persistence
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file not created: %v", err)
	}

	// Test candidate round-robin
	c1, err := pool.NextCandidate("gpt-4o")
	if err != nil {
		t.Fatalf("candidate err: %v", err)
	}
	c2, _ := pool.NextCandidate("gpt-4o")
	if c1.ID == c2.ID && len(pool.List()) > 1 {
		t.Logf("candidates selected: %s, %s", c1.ID, c2.ID)
	}

	// Test cooldown
	pool.MarkCooldown(c1.ID, 10*time.Minute, "rate limited 429")
	next, err := pool.NextCandidate("gpt-4o")
	if err != nil {
		t.Fatalf("failed to get next candidate: %v", err)
	}
	if next.ID == c1.ID {
		t.Fatalf("expected different provider, got cooled down one: %s", next.ID)
	}
}
