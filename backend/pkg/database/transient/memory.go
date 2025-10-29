package database

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type MemoryTransientDB struct {
	data   map[string]memoryItem
	mutex  sync.RWMutex
	closed bool
}

type memoryItem struct {
	value     string
	expiresAt *time.Time
}

func NewMemoryTransientDB() *MemoryTransientDB {
	db := &MemoryTransientDB{
		data: make(map[string]memoryItem),
	}

	// Start cleanup goroutine for expired items
	go db.cleanupExpired()

	return db
}

func (m *MemoryTransientDB) Get(ctx context.Context, key string) (string, error) {
	if m.closed {
		return "", fmt.Errorf("database is closed")
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Check for test error
	if testErr, exists := m.data["__test_error__"]; exists {
		return "", fmt.Errorf("%s", testErr.value)
	}

	item, exists := m.data[key]
	if !exists {
		return "", fmt.Errorf("key not found")
	}

	// Check if expired
	if item.expiresAt != nil && time.Now().After(*item.expiresAt) {
		// Item is expired, remove it
		delete(m.data, key)
		return "", fmt.Errorf("key not found")
	}

	return item.value, nil
}

func (m *MemoryTransientDB) Set(ctx context.Context, key string, value string) error {
	if m.closed {
		return fmt.Errorf("database is closed")
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check for test error
	if testErr, exists := m.data["__test_error__"]; exists {
		return fmt.Errorf("%s", testErr.value)
	}

	m.data[key] = memoryItem{
		value:     value,
		expiresAt: nil, // No expiration
	}

	return nil
}

func (m *MemoryTransientDB) SetWithExpiration(ctx context.Context, key string, value string, expiration time.Duration) error {
	if m.closed {
		return fmt.Errorf("database is closed")
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check for test error
	if testErr, exists := m.data["__test_error__"]; exists {
		return fmt.Errorf("%s", testErr.value)
	}

	expiresAt := time.Now().Add(expiration)
	m.data[key] = memoryItem{
		value:     value,
		expiresAt: &expiresAt,
	}

	return nil
}

func (m *MemoryTransientDB) Delete(ctx context.Context, key string) error {
	if m.closed {
		return fmt.Errorf("database is closed")
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.data, key)
	return nil
}

func (m *MemoryTransientDB) Exists(ctx context.Context, key string) (bool, error) {
	if m.closed {
		return false, fmt.Errorf("database is closed")
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.data[key]
	if !exists {
		return false, nil
	}

	// Check if expired
	if item.expiresAt != nil && time.Now().After(*item.expiresAt) {
		// Item is expired, remove it
		delete(m.data, key)
		return false, nil
	}

	return true, nil
}

func (m *MemoryTransientDB) Close() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.closed = true
	m.data = nil
	return nil
}

func (m *MemoryTransientDB) Ping(ctx context.Context) error {
	if m.closed {
		return fmt.Errorf("database is closed")
	}
	return nil
}

// cleanupExpired runs periodically to remove expired items
func (m *MemoryTransientDB) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if m.closed {
			return
		}

		m.mutex.Lock()
		now := time.Now()
		for key, item := range m.data {
			if item.expiresAt != nil && now.After(*item.expiresAt) {
				delete(m.data, key)
			}
		}
		m.mutex.Unlock()
	}
}

// GetAllKeys returns all non-expired keys (useful for testing)
func (m *MemoryTransientDB) GetAllKeys() []string {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var keys []string
	now := time.Now()

	for key, item := range m.data {
		if item.expiresAt == nil || now.Before(*item.expiresAt) {
			keys = append(keys, key)
		}
	}

	return keys
}

// Clear removes all data (useful for testing)
func (m *MemoryTransientDB) Clear() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.data = make(map[string]memoryItem)
}

// SetTestError forces an error state for testing
func (m *MemoryTransientDB) SetTestError(err error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Store the error in a special key
	if err != nil {
		m.data["__test_error__"] = memoryItem{value: err.Error()}
	} else {
		delete(m.data, "__test_error__")
	}
}

// HasKey checks if a key exists (useful for testing)
func (m *MemoryTransientDB) HasKey(key string) bool {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.data[key]
	if !exists {
		return false
	}

	// Check if expired
	if item.expiresAt != nil && time.Now().After(*item.expiresAt) {
		return false
	}

	return true
}

// GetDataCount returns the number of non-expired items (useful for testing)
func (m *MemoryTransientDB) GetDataCount() int {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	count := 0
	now := time.Now()

	for _, item := range m.data {
		if item.expiresAt == nil || now.Before(*item.expiresAt) {
			count++
		}
	}

	return count
}

// SetTestData sets data directly (useful for testing)
func (m *MemoryTransientDB) SetTestData(key, value string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.data[key] = memoryItem{
		value:     value,
		expiresAt: nil,
	}
}
