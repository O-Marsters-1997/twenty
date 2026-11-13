package auth

import (
	"testing"
	"time"
)

func TestMemoryThrottle_AllowsBurstThenRefills(t *testing.T) {
	t.Parallel()
	clock := time.UnixMilli(1700000000000)
	throttle := NewMemoryThrottle()
	throttle.now = func() time.Time { return clock }

	for i := range 3 {
		if !throttle.Allow("user", 3, time.Hour) {
			t.Fatalf("call %d denied inside the burst", i+1)
		}
	}
	if throttle.Allow("user", 3, time.Hour) {
		t.Error("fourth call allowed after the burst")
	}
	if !throttle.Allow("other", 3, time.Hour) {
		t.Error("another key shares the exhausted bucket")
	}
	clock = clock.Add(20 * time.Minute)
	if !throttle.Allow("user", 3, time.Hour) {
		t.Error("call denied after one token refilled")
	}
	if throttle.Allow("user", 3, time.Hour) {
		t.Error("a second call allowed before another token refilled")
	}
}
