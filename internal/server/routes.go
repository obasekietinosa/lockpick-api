package server

import (
	"encoding/json"
	"net/http"

	"github.com/obasekietinosa/lockpick-api/internal/socket"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.healthHandler)
	mux.HandleFunc("/ws", s.socketHandler)
	mux.HandleFunc("POST /games", s.HandleCreateGame)
	mux.HandleFunc("POST /games/join", s.HandleJoinGame)

	return mux
}

func (s *Server) socketHandler(w http.ResponseWriter, r *http.Request) {
	socket.ServeWs(s.hub, w, r)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, _ := json.Marshal(map[string]string{
		"status": "healthy",
	})
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonResp)
}
