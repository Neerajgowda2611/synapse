package handler

import (
	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/authz"
	"github.com/profiler/backend/internal/middleware"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/internal/xint"
	"gorm.io/gorm"
)

func RegisterRoutes(
	router *gin.Engine,
	db *gorm.DB,
	validator *auth.Validator,
	resolver *auth.Resolver,
	enforcer *casbin.Enforcer,
	loginClient *auth.LoginClient,
	authxSvc *auth.AuthxSessionService,
	authxEnabled bool,
	xintCfg xint.Config,
	devMode bool,
) *service.ObservationService {
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
	bindingRepo := repository.NewBindingRegistryRepository(db)
	typeRegistryRepo := repository.NewObservationTypeRegistryRepository(db)
	canonicalObservationRepo := repository.NewCanonicalObservationRepository(db)
	userIdentityRepo := repository.NewUserIdentityRepository(db)
	signalRepo := repository.NewSignalRepository(db)
	signalObsRepo := repository.NewSignalObservationRepository(db)
	claimRepo := repository.NewConstructClaimRegistryRepository(db)
	registerRepo := repository.NewConstructRegisterRepository(db)
	normRepo := repository.NewMetricNormRepository(db)
	rewardRepo := repository.NewRewardSystemRepository(db)
	jobRepo := repository.NewJobRepository(db)
	metricRunRepo := repository.NewMetricRunRepository(db)
	estimateRepo := repository.NewConstructEstimateRepository(db)
	rewardScoreRepo := repository.NewRewardScoreRepository(db)

	metricService := service.NewMetricService(
		signalRepo,
		signalObsRepo,
		canonicalObservationRepo,
		claimRepo,
		registerRepo,
		normRepo,
		rewardRepo,
		jobRepo,
		metricRunRepo,
		estimateRepo,
		rewardScoreRepo,
	)
	profileHandler := NewProfileHandler(metricService, enforcer)

	// Services
	institutionService := service.NewInstitutionService(institutionRepo)
	institutionUserService := service.NewInstitutionUserService(userRepo)
	dataSourceService := service.NewDataSourceService(
		dataSourceRepo,
		institutionRepo,
		connectorRepo,
		credentialRepo,
		schemaRepo,
		entityRepo,
		rawRecordRepo,
		observationRepo,
		syncJobRepo,
		bindingRepo,
		typeRegistryRepo,
		canonicalObservationRepo,
		userRepo,
		userIdentityRepo,
	)

	// Handlers
	authHandler := NewAuthHandler()
	authLoginHandler := NewAuthLoginHandler(loginClient, devMode)
	authxHandler := NewAuthxHandler(authxSvc, authxEnabled)
	xintResolver := xint.NewResolver(userRepo)
	jobIngestService := service.NewJobIngestService(db, jobRepo, rewardRepo, institutionRepo, registerRepo)
	batchFitService := service.NewBatchFitService(jobRepo, userRepo, rewardRepo, metricService, xintCfg.ProfileLinkSigner)
	projectFitService := service.NewProjectFitService(jobRepo, userRepo, rewardRepo, metricService, xintCfg.ProfileLinkSigner)
	xintHandler := NewXintHandler(xintResolver, jobIngestService, batchFitService)
	projectFitHandler := NewProjectFitHandler(projectFitService)
	institutionHandler := NewInstitutionHandler(institutionService)
	institutionUserHandler := NewInstitutionUserHandler(institutionUserService)
	dataSourceHandler := NewDataSourceHandler(dataSourceService)
	webhookHandler := NewWebhookHandler(dataSourceService)

	requireAuth := middleware.RequireAuth(validator, resolver)

	api := router.Group("/api/v1")

	// Public auth — username/password login (same pattern as other Xcelerator apps)
	authPublic := api.Group("/auth")
	{
		authPublic.POST("/login", authLoginHandler.Login)
		authPublic.POST("/token-exchange", authLoginHandler.TokenExchange)
		authPublic.POST("/authx/session-token", authxHandler.SessionToken)
		authPublic.POST("/authx/refresh-session", authxHandler.RefreshSession)
		authPublic.POST("/authx/logout", authxHandler.Logout)
	}

	// Auth — requires a valid token but no specific role
	api.GET("/auth/me", requireAuth, authHandler.Me)

	webhooks := api.Group("/webhooks")
	{
		// Token identifies the data source; event semantics live in the envelope body.
		webhooks.POST("/ingest/:token", webhookHandler.Ingest)
	}

	xintGroup := api.Group("/xint", middleware.RequireXint(xintCfg))
	{
		xintGroup.GET("/health", xintHandler.Health)
		xintGroup.GET("/traits", xintHandler.ListTraits)
		xintGroup.GET("/users/resolve", xintHandler.ResolveUser)
		xintGroup.POST("/jobs", xintHandler.UpsertJob)
		xintGroup.GET("/jobs/lookup", xintHandler.LookupJob)
		xintGroup.POST("/fit/batch", xintHandler.BatchFit)
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

	api.GET("/project-fit", requireAuth, projectFitHandler.Get)

	jobs := api.Group("/jobs", requireAuth, authz.Require(enforcer, authz.ResourceJobs, authz.ActionRead))
	{
		jobs.GET("", profileHandler.ListJobs)
		jobs.GET("/:id", profileHandler.GetJob)
	}

	users := api.Group("/users", requireAuth)
	{
		users.GET("/:userId/traits", profileHandler.ListUserTraits)
		users.POST("/:userId/traits/refresh", profileHandler.RefreshUserTraits)
		users.GET("/:userId/streams/activity", profileHandler.ListUserStreamActivity)
		users.GET("/:userId/jobs/fit", profileHandler.ListUserJobFits)
		users.GET("/:userId/jobs/:jobId/fit", profileHandler.GetUserJobFit)
		users.GET("/:userId/traits/:trait/evidence", profileHandler.GetTraitEvidence)
	}

	return dataSourceService.ObservationService()
}
