package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSMiddleware(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tests := []struct {
		name           string
		origin         string
		method         string
		expectedOrigin string
		expectedStatus int
	}{
		{
			name:           "Allowed Origin - Localhost",
			origin:         "http://localhost:3000",
			method:         "GET",
			expectedOrigin: "http://localhost:3000",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Allowed Origin - Localhost IP",
			origin:         "http://127.0.0.1:8080",
			method:         "GET",
			expectedOrigin: "http://127.0.0.1:8080",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Allowed Origin - lockpick.co root",
			origin:         "https://lockpick.co",
			method:         "GET",
			expectedOrigin: "https://lockpick.co",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Allowed Origin - lockpick.co sub",
			origin:         "https://api.lockpick.co",
			method:         "GET",
			expectedOrigin: "https://api.lockpick.co",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Disallowed Origin - evil lockpick",
			origin:         "https://evillockpick.co",
			method:         "GET",
			expectedOrigin: "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Disallowed Origin",
			origin:         "http://evil.com",
			method:         "GET",
			expectedOrigin: "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Preflight Request",
			origin:         "http://localhost:3000",
			method:         "OPTIONS",
			expectedOrigin: "http://localhost:3000",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			w := httptest.NewRecorder()

			CORSMiddleware(nextHandler).ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			origin := w.Header().Get("Access-Control-Allow-Origin")
			if origin != tt.expectedOrigin {
				t.Errorf("expected origin header %q, got %q", tt.expectedOrigin, origin)
			}
		})
	}
}
