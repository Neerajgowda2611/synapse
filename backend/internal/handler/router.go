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
	userRepo := repository.NewUserRepository(db)
	connectorRepo := repository.NewConnectorDefinitionRepository(db)
	dataSourceRepo := repository.NewDataSourceRepository(db)
	credentialRepo := repository.NewConnectorCredentialRepository(db)
	schemaRepo := repository.NewSchemaSnapshotRepository(db)
	entityRepo := repository.NewDataSourceEntityRepository(db)
	rawRecordRepo := repository.NewRawRecordRepository(db)
	observationRepo := repository.NewObservationRepository(db)
	syncJobRepo := repository.NewSyncJobRepository(db)

	// Services
	institutionService := service.NewInstitutionService(institutionRepo)
	institutionUserService := service.NewInstitutionUserService(userRepo)
	dataSourceService := service.NewDataSourceService(dataSourceRepo, institutionRepo, connectorRepo, credentialRepo, schemaRepo, entityRepo, rawRecordRepo, observationRepo, syncJobRepo)

	// Handlers
	authHandler := NewAuthHandler()
	authLoginHandler := NewAuthLoginHandler(loginClient, devMode)
	institutionHandler := NewInstitutionHandler(institutionService)
	institutionUserHandler := NewInstitutionUserHandler(institutionUserService, enforcer)
	dataSourceHandler := NewDataSourceHandler(dataSourceService)
	webhookHandler := NewWebhookHandler(dataSourceService)

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

	webhooks := api.Group("/webhooks")
	{
		// Token identifies the data source; event semantics live in the envelope body.
		webhooks.POST("/ingest/:token", webhookHandler.Ingest)
	}

	api.GET("/connectors",
		requireAuth,
		authz.Require(enforcer, authz.ResourceConnectors, authz.ActionRead),
		dataSourceHandler.ListConnectors,
	)

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
		dataSources.GET("",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.List,
		)
		dataSources.GET("/:id",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.GetByID,
		)
		dataSources.GET("/:id/credentials",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.GetCredentials,
		)
		dataSources.PUT("/:id/credentials",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionUpdate),
			dataSourceHandler.StoreCredentials,
		)
		dataSources.POST("/:id/test",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionUpdate),
			dataSourceHandler.TestConnection,
		)
		dataSources.POST("/:id/discover",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionUpdate),
			dataSourceHandler.DiscoverSchema,
		)
		dataSources.GET("/:id/schema",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.GetSchema,
		)
		dataSources.GET("/:id/entities",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.ListEntities,
		)
		dataSources.PUT("/:id/entities",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionUpdate),
			dataSourceHandler.SaveEntities,
		)
		dataSources.GET("/:id/records",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.ListRecords,
		)
		dataSources.GET("/:id/observations",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.ListObservations,
		)
		dataSources.GET("/:id/sync-jobs",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.ListSyncJobs,
		)
		dataSources.GET("/:id/sync-jobs/latest",
			authz.Require(enforcer, authz.ResourceDataSources, authz.ActionRead),
			dataSourceHandler.GetLatestSyncJob,
		)
	}
}
