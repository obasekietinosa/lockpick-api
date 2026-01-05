package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/obasekietinosa/lockpick-api/internal/config"
	"github.com/obasekietinosa/lockpick-api/internal/socket"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

type Server struct {
	port  string
	hub   *socket.Hub
	store store.Store
}

func NewServer(cfg *config.Config, hub *socket.Hub, store store.Store) *http.Server {
	NewServer := &Server{
		port:  cfg.Port,
		hub:   hub,
		store: store,
	}

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
