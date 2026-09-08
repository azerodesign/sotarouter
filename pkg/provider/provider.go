package provider

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Provider represents a single upstream LLM provider / API key target.
type Provider struct {
	ID           string                 `json:"id"`
	Provider     string                 `json:"provider"`
	AuthType     string                 `json:"authType"`
	Name         string                 `json:"name"`
	Email        string                 `json:"email"`
	Priority     int                    `json:"priority"`
	IsActive     bool                   `json:"isActive"`
	TestStatus   string                 `json:"testStatus"`
	LastError    string                 `json:"lastError,omitempty"`
	ErrorCode    string                 `json:"errorCode,omitempty"`
	BackoffLevel int                    `json:"backoffLevel"`
	ModelLocks   []string               `json:"modelLocks"`
	BaseURL      string                 `json:"baseUrl,omitempty"`
	APIKey       string                 `json:"apiKey,omitempty"`
	Data         map[string]interface{} `json:"data,omitempty"`
	CooldownUntil time.Time             `json:"-"`
	CreatedAt    string                 `json:"createdAt"`
	UpdatedAt    string                 `json:"updatedAt"`
}

// Pool manages a collection of providers with thread-safe selection, rotation, and persistence.
type Pool struct {
	mu        sync.RWMutex
	filePath  string
	providers []*Provider
	counter   uint64
}

func NewPool(filePath string) (*Pool, error) {
	p := &Pool{
		filePath: filePath,
	}
	if err := p.load(); err != nil {
		return nil, err
	}
	return p, nil
}

func (p *Pool) load() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.filePath == "" {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(p.filePath), 0755); err != nil {
		return err
	}

	data, err := os.ReadFile(p.filePath)
	if os.IsNotExist(err) {
		p.providers = []*Provider{}
		return nil
	} else if err != nil {
		return err
	}

	var list []*Provider
	if err := json.Unmarshal(data, &list); err != nil {
		return err
	}

	for _, item := range list {
		// Populate root fields from data if missing
		if item.BaseURL == "" && item.Data != nil {
			if u, ok := item.Data["baseUrl"].(string); ok {
				item.BaseURL = u
			}
		}
		if item.APIKey == "" && item.Data != nil {
			if k, ok := item.Data["apiKey"].(string); ok && k != "" {
				item.APIKey = k
			} else if k, ok := item.Data["accessToken"].(string); ok && k != "" {
				item.APIKey = k
			} else if sub, ok := item.Data["data"].(map[string]interface{}); ok {
				if k, ok := sub["accessToken"].(string); ok && k != "" {
					item.APIKey = k
				} else if k, ok := sub["apiKey"].(string); ok && k != "" {
					item.APIKey = k
				}
			}
		}
		// Extract modelLocks from nested data if empty
		if len(item.ModelLocks) == 0 && item.Data != nil {
			var sub map[string]interface{}
			if s, ok := item.Data["data"].(map[string]interface{}); ok {
				sub = s
			} else {
				sub = item.Data
			}
			for k, v := range sub {
				if strings.HasPrefix(k, "modelLock_") {
					if b, ok := v.(bool); ok && b {
						modelName := strings.TrimPrefix(k, "modelLock_")
						item.ModelLocks = append(item.ModelLocks, modelName)
					}
				}
			}
		}
	}

	p.providers = list
	return nil
}

func (p *Pool) Save() error {
	p.mu.RLock()
	defer p.mu.RUnlock()

	if p.filePath == "" {
		return nil
	}

	data, err := json.MarshalIndent(p.providers, "", "  ")
	if err != nil {
		return err
	}

	tmpFile := p.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmpFile, p.filePath)
}

func (p *Pool) List() []Provider {
	p.mu.RLock()
	defer p.mu.RUnlock()

	res := make([]Provider, len(p.providers))
	for i, prv := range p.providers {
		res[i] = *prv
	}
	return res
}

func (p *Pool) Upsert(prv *Provider) error {
	p.mu.Lock()
	found := false
	now := time.Now().UTC().Format(time.RFC3339)
	if prv.CreatedAt == "" {
		prv.CreatedAt = now
	}
	prv.UpdatedAt = now

	for i, existing := range p.providers {
		if existing.ID == prv.ID {
			p.providers[i] = prv
			found = true
			break
		}
	}
	if !found {
		p.providers = append(p.providers, prv)
	}
	p.mu.Unlock()

	return p.Save()
}

func (p *Pool) Delete(id string) error {
	p.mu.Lock()
	filtered := make([]*Provider, 0, len(p.providers))
	for _, item := range p.providers {
		if item.ID != id {
			filtered = append(filtered, item)
		}
	}
	p.providers = filtered
	p.mu.Unlock()

	return p.Save()
}

// NextCandidate returns available provider for model with cooldown & priority consideration.
func (p *Pool) NextCandidate(model string) (*Provider, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := time.Now()
	var exactMatches []*Provider
	var generalCandidates []*Provider

	for _, prv := range p.providers {
		if !prv.IsActive {
			continue
		}
		if prv.CooldownUntil.After(now) {
			continue
		}

		pName := strings.ToLower(prv.Provider)

		// Check if modelLocks exist
		if len(prv.ModelLocks) > 0 {
			matched := false
			for _, lock := range prv.ModelLocks {
				if lock == model || lock == "modelLock_"+model {
					matched = true
					break
				}
			}
			if matched {
				exactMatches = append(exactMatches, prv)
			}
			continue
		}

		// Hint matching based on model family
		if strings.HasPrefix(model, "gemini-") || strings.HasPrefix(model, "claude-") || strings.HasPrefix(model, "gpt-oss-") {
			if pName == "antigravity" {
				exactMatches = append(exactMatches, prv)
				continue
			}
		}
		if strings.HasPrefix(model, "gpt-") || strings.HasPrefix(model, "o1") || strings.HasPrefix(model, "o3") || strings.HasPrefix(model, "chatgpt") {
			if pName == "codex" || pName == "openai" {
				exactMatches = append(exactMatches, prv)
				continue
			}
		}

		generalCandidates = append(generalCandidates, prv)
	}

	candidates := exactMatches
	if len(candidates) == 0 {
		candidates = generalCandidates
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("no healthy provider available for model: %s", model)
	}

	// Simple round-robin over candidates
	idx := p.counter % uint64(len(candidates))
	p.counter++
	return candidates[idx], nil
}

// MarkCooldown puts a provider into temporary cooldown on rate limit (429) or 5xx
func (p *Pool) MarkCooldown(id string, duration time.Duration, errMsg string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, prv := range p.providers {
		if prv.ID == id {
			prv.CooldownUntil = time.Now().Add(duration)
			prv.TestStatus = "cooldown"
			prv.LastError = errMsg
			prv.BackoffLevel++
			break
		}
	}
}

// MarkSuccess clears errors on successful request
func (p *Pool) MarkSuccess(id string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, prv := range p.providers {
		if prv.ID == id {
			prv.TestStatus = "active"
			prv.LastError = ""
			prv.BackoffLevel = 0
			break
		}
	}
}
