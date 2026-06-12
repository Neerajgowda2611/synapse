package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"gorm.io/gorm"
)

func RegisterRoutes(router *gin.Engine, db *gorm.DB) {
	institutionRepo := repository.NewInstitutionRepository(db)
	connectorRepo := repository.NewConnectorDefinitionRepository(db)
	dataSourceRepo := repository.NewDataSourceRepository(db)

	institutionService := service.NewInstitutionService(institutionRepo)
	dataSourceService := service.NewDataSourceService(dataSourceRepo, institutionRepo, connectorRepo)

	institutionHandler := NewInstitutionHandler(institutionService)
	dataSourceHandler := NewDataSourceHandler(dataSourceService)

	api := router.Group("/api/v1")
	{
		institutions := api.Group("/institutions")
		institutions.POST("", institutionHandler.Create)
		institutions.GET("", institutionHandler.List)
		institutions.GET("/:id", institutionHandler.GetByID)

		dataSources := api.Group("/data-sources")
		dataSources.POST("", dataSourceHandler.Create)
		dataSources.GET("", dataSourceHandler.List)
		dataSources.GET("/:id", dataSourceHandler.GetByID)
	}
}
