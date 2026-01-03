package server

import (
	"log"
	"net/http"
	"regexp"
	"strings"
)

func CORSMiddleware(next http.Handler) http.Handler {
	netlifyDeployPreviewRegex := regexp.MustCompile(`^https://deploy-preview-\d+--play-lockpick\.netlify\.app/?$`)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		if origin != "" {
			if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
				allowed = true
			} else if origin == "https://lockpick.co" || strings.HasSuffix(origin, ".lockpick.co") {
				allowed = true
			} else if netlifyDeployPreviewRegex.MatchString(origin) {
				allowed = true
			}
		}

		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if next != nil {
			next.ServeHTTP(w, r)
		} else {
			log.Println("Next handler is nil in CORSMiddleware")
		}
	})
}
