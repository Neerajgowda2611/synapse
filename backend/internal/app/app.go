package app

import (
	"context"
	"errors"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/profiler/backend/configs"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/authz"
	"github.com/profiler/backend/internal/handler"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/middleware"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/pkg/database"
)

func Start() {
	configPath := flag.String("config", "", "path to .env file")
	flag.Parse()

	logs.New()

	cfg, err := configs.Load(*configPath)
	if err != nil {
		logs.Error("failed to load config", "error", err.Error())
		os.Exit(1)
	}

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := database.InitDB(cfg.DatabaseURL)
	if err != nil {
		logs.Error("failed to initialize database", "error", err.Error())
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		logs.Error("failed to access database pool", "error", err.Error())
		os.Exit(1)
	}
	defer sqlDB.Close()

	logs.Info("database connected")

	validator, err := auth.NewValidator(cfg.ZitadelIssuer, []string{cfg.ZitadelAudience, cfg.ZitadelWebClientID}, cfg.ZitadelJWKSURL)
	if err != nil {
		logs.Error("failed to initialize JWT validator", "error", err.Error())
		os.Exit(1)
	}
	logs.Info("JWT validator initialized", "issuer", cfg.ZitadelIssuer)

	resolver := auth.NewResolver(
		repository.NewPlatformAdminRepository(db),
		repository.NewInstitutionUserRepository(db),
		repository.NewLearnerRepository(db),
	)

	enforcer, err := authz.NewEnforcer(db)
	if err != nil {
		logs.Error("failed to initialize Casbin enforcer", "error", err.Error())
		os.Exit(1)
	}
	logs.Info("Casbin enforcer initialized")

	loginClient := auth.NewLoginClient(
		cfg.ZitadelIssuer,
		cfg.ZitadelWebClientID,
		cfg.ZitadelRedirectURI,
		cfg.ZitadelServiceToken,
		cfg.ZitadelLoginClientID,
		os.Getenv("ZITADEL_ORG_ID"),
		cfg.ZitadelAudience,
	)
	if loginClient.Enabled() {
		logs.Info("Zitadel password login enabled")
	} else {
		logs.Info("Zitadel password login disabled — set ZITADEL_SERVICE_USER_TOKEN to enable")
	}

	router := newRouter(db, validator, resolver, enforcer, loginClient, cfg.CORSAllowOrigins, cfg.AppEnv != "production")

	srv := &http.Server{
		Addr:         cfg.ServerAddress(),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logs.Info("server starting", "address", srv.Addr, "env", cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logs.Error("server failed", "error", err.Error())
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logs.Info("server shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logs.Error("server shutdown failed", "error", err.Error())
		os.Exit(1)
	}

	logs.Info("server stopped")
}

func newRouter(
	db *gorm.DB,
	validator *auth.Validator,
	resolver *auth.Resolver,
	enforcer *casbin.Enforcer,
	loginClient *auth.LoginClient,
	corsAllowOrigin string,
	devMode bool,
) *gin.Engine {
	router := gin.New()
	router.Use(middleware.Recovery())
	router.Use(middleware.RequestLogger())
	router.Use(middleware.CORS(corsAllowOrigin))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	handler.RegisterRoutes(router, db, validator, resolver, enforcer, loginClient, devMode)

	return router
}
