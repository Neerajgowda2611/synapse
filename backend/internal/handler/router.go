package handler

import (
	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/authz"
	"github.com/profiler/backend/internal/middleware"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"gorm.io/gorm"
)

func RegisterRoutes(
	router *gin.Engine,
	db *gorm.DB,
	validator *auth.Validator,
	resolver *auth.Resolver,
	enforcer *casbin.Enforcer,
	loginClient *auth.LoginClient,
	devMode bool,
) {
	// Repositories
	institutionRepo := repository.NewInstitutionRepository(db)
	institutionUserRepo := repository.NewInstitutionUserRepository(db)
	connectorRepo := repository.NewConnectorDefinitionRepository(db)
	dataSourceRepo := repository.NewDataSourceRepository(db)

	// Services
	institutionService := service.NewInstitutionService(institutionRepo)
	institutionUserService := service.NewInstitutionUserService(institutionUserRepo)
	dataSourceService := service.NewDataSourceService(dataSourceRepo, institutionRepo, connectorRepo)

	// Handlers
	authHandler := NewAuthHandler()
	authLoginHandler := NewAuthLoginHandler(loginClient, devMode)
	institutionHandler := NewInstitutionHandler(institutionService)
	institutionUserHandler := NewInstitutionUserHandler(institutionUserService)
	dataSourceHandler := NewDataSourceHandler(dataSourceService)

	requireAuth := middleware.RequireAuth(validator, resolver)

	api := router.Group("/api/v1")

	// Public auth — username/password login (same pattern as other Xcelerator apps)
	authPublic := api.Group("/auth")
	{
		authPublic.POST("/login", authLoginHandler.Login)
		authPublic.POST("/token-exchange", authLoginHandler.TokenExchange)
	}

	// Auth — requires a valid token but no specific role
	api.GET("/auth/me", requireAuth, authHandler.Me)

	// Institutions — protected
	institutions := api.Group("/institutions", requireAuth)
	{
		institutions.POST("",
			authz.Require(enforcer, authz.ResourceInstitutions, authz.ActionCreate),
			institutionHandler.Create,
		)
		institutions.GET("", institutionHandler.List)
		institutions.GET("/:id", institutionHandler.GetByID)

		// Institution users
		institutions.POST("/:id/users",
			authz.Require(enforcer, authz.ResourceUsers, authz.ActionCreate),
			institutionUserHandler.Create,
		)
		institutions.GET("/:id/users",
			authz.Require(enforcer, authz.ResourceUsers, authz.ActionRead),
			institutionUserHandler.List,
		)
	}

	// Data sources — protected
	dataSources := api.Group("/data-sources", requireAuth)
	{
		dataSources.POST("",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionCreate),
			dataSourceHandler.Create,
		)
		dataSources.GET("", dataSourceHandler.List)
		dataSources.GET("/:id",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.GetByID,
		)
	}
}
