package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

var (
	ErrDataSourceNotFound          = errors.New("data source not found")
	ErrInvalidDataSource           = errors.New("invalid data source input")
	ErrConnectorDefinitionNotFound = errors.New("connector definition not found")
)

type CreateDataSourceInput struct {
	InstitutionID         uuid.UUID
	ConnectorDefinitionID uuid.UUID
	Name                  string
	Status                string
}

type DataSourceService struct {
	repo            *repository.DataSourceRepository
	institutionRepo *repository.InstitutionRepository
	connectorRepo   *repository.ConnectorDefinitionRepository
}

func NewDataSourceService(
	repo *repository.DataSourceRepository,
	institutionRepo *repository.InstitutionRepository,
	connectorRepo *repository.ConnectorDefinitionRepository,
) *DataSourceService {
	return &DataSourceService{
		repo:            repo,
		institutionRepo: institutionRepo,
		connectorRepo:   connectorRepo,
	}
}

func (s *DataSourceService) Create(ctx context.Context, input CreateDataSourceInput) (*model.DataSource, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" || input.InstitutionID == uuid.Nil || input.ConnectorDefinitionID == uuid.Nil {
		return nil, ErrInvalidDataSource
	}

	if _, err := s.institutionRepo.GetByID(ctx, input.InstitutionID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInstitutionNotFound
		}
		return nil, err
	}

	if _, err := s.connectorRepo.GetByID(ctx, input.ConnectorDefinitionID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectorDefinitionNotFound
		}
		return nil, err
	}

	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}

	dataSource := &model.DataSource{
		InstitutionID:         input.InstitutionID,
		ConnectorDefinitionID: input.ConnectorDefinitionID,
		Name:                  name,
		Status:                status,
	}

	if err := s.repo.Create(ctx, dataSource); err != nil {
		return nil, err
	}

	return dataSource, nil
}

func (s *DataSourceService) List(ctx context.Context, institutionID, connectorDefinitionID *uuid.UUID, limit, offset int) ([]model.DataSource, error) {
	switch {
	case institutionID != nil:
		return s.repo.ListByInstitutionID(ctx, *institutionID)
	case connectorDefinitionID != nil:
		return s.repo.ListByConnectorDefinitionID(ctx, *connectorDefinitionID)
	default:
		return s.repo.List(ctx, limit, offset)
	}
}

func (s *DataSourceService) GetByID(ctx context.Context, id uuid.UUID) (*model.DataSource, error) {
	dataSource, err := s.repo.GetWithAssociations(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDataSourceNotFound
		}
		return nil, err
	}
	return dataSource, nil
}
