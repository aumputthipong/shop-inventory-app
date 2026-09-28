package auth

import (
	"strings"
	"sync"
	"time"
)

const (
	maxFailedLogins   = 5
	failedLoginWindow = 15 * time.Minute
)

// attemptLimiter is per process and in memory; see docs/CODE-NOTES.md for its limits.
type attemptLimiter struct {
	mu       sync.Mutex
	now      func() time.Time
	failures map[string][]time.Time
}

func newAttemptLimiter(now func() time.Time) *attemptLimiter {
	return &attemptLimiter{now: now, failures: map[string][]time.Time{}}
}

func (l *attemptLimiter) blocked(email string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.recent(key(email))) >= maxFailedLogins
}

func (l *attemptLimiter) fail(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	k := key(email)
	l.failures[k] = append(l.recent(k), l.now())
}

func (l *attemptLimiter) reset(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, key(email))
}

func (l *attemptLimiter) recent(k string) []time.Time {
	cutoff := l.now().Add(-failedLoginWindow)
	kept := l.failures[k][:0]
	for _, t := range l.failures[k] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) == 0 {
		delete(l.failures, k)
		return nil
	}
	l.failures[k] = kept
	return kept
}

func key(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
