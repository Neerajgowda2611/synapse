package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/observation"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

type ObservationService struct {
	observationRepo  *repository.ObservationRepository
	bindingRepo      *repository.BindingRegistryRepository
	typeRegistryRepo *repository.ObservationTypeRegistryRepository
	canonicalRepo    *repository.CanonicalObservationRepository
	userRepo         *repository.UserRepository
	userIdentityRepo *repository.UserIdentityRepository
}

func NewObservationService(
	observationRepo *repository.ObservationRepository,
	bindingRepo *repository.BindingRegistryRepository,
	typeRegistryRepo *repository.ObservationTypeRegistryRepository,
	canonicalRepo *repository.CanonicalObservationRepository,
	userRepo *repository.UserRepository,
	userIdentityRepo *repository.UserIdentityRepository,
) *ObservationService {
	return &ObservationService{
		observationRepo:  observationRepo,
		bindingRepo:      bindingRepo,
		typeRegistryRepo: typeRegistryRepo,
		canonicalRepo:    canonicalRepo,
		userRepo:         userRepo,
		userIdentityRepo: userIdentityRepo,
	}
}

func (s *ObservationService) ProcessObservation(ctx context.Context, observationID uuid.UUID) error {
	obs, err := s.observationRepo.GetByID(ctx, observationID)
	if err != nil {
		return err
	}

	switch obs.Status {
	case model.ObservationStatusCanonicalized:
		return nil
	case model.ObservationStatusReceived:
		claimed, err := s.observationRepo.ClaimForProcessing(ctx, observationID)
		if err != nil {
			return err
		}
		if !claimed {
			return nil
		}
	case model.ObservationStatusProcessing:
		// Already claimed (e.g. by background worker batch).
	case model.ObservationStatusQuarantined:
		// Manual / batch reprocess.
	default:
		return nil
	}

	return s.processClaimed(ctx, observationID)
}

func (s *ObservationService) processClaimed(ctx context.Context, observationID uuid.UUID) error {
	obs, err := s.observationRepo.GetByID(ctx, observationID)
	if err != nil {
		return err
	}

	shapeSignature, err := observation.ComputeShapeSignature(json.RawMessage(obs.Payload))
	if err != nil {
		reason := observation.QuarantineReasonInvalidPayload + ": " + err.Error()
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, nil)
	}

	bindings, err := s.bindingRepo.ListApprovedBySource(ctx, obs.SourceConnector, obs.SourceEventType)
	if err != nil {
		return err
	}
	if len(bindings) == 0 {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, observation.QuarantineReasonNoBinding, shapeSignature)
	}

	var payload map[string]any
	if err := json.Unmarshal(obs.Payload, &payload); err != nil {
		reason := observation.QuarantineReasonInvalidPayload + ": " + err.Error()
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, shapeSignature)
	}

	binding, spec, err := s.pickMatchingBinding(bindings, payload)
	if err != nil {
		reason := observation.QuarantineReasonInvalidBinding + ": " + err.Error()
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, shapeSignature)
	}
	if binding == nil || spec == nil {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, observation.QuarantineReasonNoBinding, shapeSignature)
	}

	fields, reason := s.applyMappings(payload, spec)
	if reason != "" {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, shapeSignature)
	}

	observationType := chooseObservationType(spec, binding)
	if reason := s.validateAgainstRegistry(ctx, observationType, fields); reason != "" {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, shapeSignature)
	}

	userID, reason, err := s.resolveUser(ctx, obs.DataSourceID, payload, spec.EntityResolution)
	if err != nil {
		return err
	}
	if reason != "" {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, reason, shapeSignature)
	}

	fieldsJSON, err := json.Marshal(fields)
	if err != nil {
		return s.observationRepo.MarkQuarantined(ctx, obs.ID, observation.QuarantineReasonMappingError+": marshal fields", shapeSignature)
	}

	canonical := &model.CanonicalObservation{
		RawObservationID: obs.ID,
		ObservationType:  observationType,
		UserID:           userID,
		Fields:           model.JSONB(fieldsJSON),
		BindingID:        binding.BindingID,
		BindingVersion:   binding.Version,
		OccurredAt:       obs.OccurredAt,
	}
	if err := s.canonicalRepo.Create(ctx, canonical); err != nil {
		if !repository.IsDuplicateKey(err) {
			return err
		}
	}

	if err := s.observationRepo.MarkCanonicalized(ctx, obs.ID, binding.BindingID, binding.Version, canonical.ObservationType); err != nil {
		return err
	}

	return nil
}

func (s *ObservationService) ReprocessQuarantinedByConnector(ctx context.Context, sourceConnector string) (int, error) {
	observations, err := s.observationRepo.ListQuarantinedBySourceConnector(ctx, sourceConnector)
	if err != nil {
		return 0, err
	}
	for _, obs := range observations {
		if err := s.ProcessObservation(ctx, obs.ID); err != nil {
			return 0, err
		}
	}
	return len(observations), nil
}

func (s *ObservationService) ProcessObservationAsync(observationID uuid.UUID) {
	go func() {
		if err := s.ProcessObservation(context.Background(), observationID); err != nil {
			logs.Error("observation processing failed", "observation_id", observationID.String(), "error", err.Error())
		}
	}()
}

func (s *ObservationService) ClaimReceivedBatch(ctx context.Context, limit int) ([]uuid.UUID, error) {
	return s.observationRepo.ClaimReceivedBatch(ctx, limit)
}

func (s *ObservationService) ReleaseStaleProcessing(ctx context.Context, olderThan time.Duration) (int64, error) {
	return s.observationRepo.ReleaseStaleProcessing(ctx, olderThan)
}

func (s *ObservationService) pickMatchingBinding(bindings []model.BindingRegistry, payload map[string]any) (*model.BindingRegistry, *observation.BindingSpec, error) {
	for _, binding := range bindings {
		spec, err := observation.ParseBindingSpec(json.RawMessage(binding.Spec))
		if err != nil {
			return nil, nil, err
		}
		if !payloadMatches(payload, spec.Match.PayloadEquals) {
			continue
		}
		return &binding, spec, nil
	}
	return nil, nil, nil
}

func payloadMatches(payload map[string]any, equals map[string]any) bool {
	if len(equals) == 0 {
		return true
	}
	for key, want := range equals {
		got, ok := observation.GetPath(payload, key)
		if !ok || fmt.Sprint(got) != fmt.Sprint(want) {
			return false
		}
	}
	return true
}

func (s *ObservationService) applyMappings(payload map[string]any, spec *observation.BindingSpec) (map[string]any, string) {
	fields := make(map[string]any, len(spec.FieldMappings))
	for _, mapping := range spec.FieldMappings {
		canonicalField := strings.TrimSpace(mapping.CanonicalField)
		if canonicalField == "" {
			return nil, observation.QuarantineReasonMappingError + ": missing canonical_field"
		}
		if mapping.Transform == observation.TransformConstant {
			value, err := observation.ApplyTransform(nil, mapping)
			if err != nil {
				return nil, observation.QuarantineReasonMappingError + ": " + err.Error()
			}
			fields[canonicalField] = value
			continue
		}
		raw, ok := observation.GetPath(payload, mapping.SourcePath)
		if !ok {
			if mapping.Required {
				return nil, observation.QuarantineReasonMappingError + ": missing required field " + mapping.SourcePath
			}
			if mapping.Default != nil {
				fields[canonicalField] = mapping.Default
			}
			continue
		}
		value, err := observation.ApplyTransform(raw, mapping)
		if err != nil {
			return nil, observation.QuarantineReasonMappingError + ": " + err.Error()
		}
		fields[canonicalField] = value
	}
	if len(fields) == 0 {
		return nil, observation.QuarantineReasonMappingError + ": empty fields"
	}
	return fields, ""
}

func (s *ObservationService) validateAgainstRegistry(ctx context.Context, observationType string, fields map[string]any) string {
	row, err := s.typeRegistryRepo.GetByType(ctx, observationType)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return observation.QuarantineReasonRegistryValidation + ": unknown observation_type '" + observationType + "'"
		}
		return observation.QuarantineReasonRegistryValidation + ": " + err.Error()
	}

	fieldTypes, err := observation.ParseFieldTypes(json.RawMessage(row.Fields))
	if err != nil {
		return observation.QuarantineReasonRegistryValidation + ": invalid type schema"
	}
	schema := &observation.TypeSchema{
		ObservationType: row.ObservationType,
		Version:         row.Version,
		Fields:          fieldTypes,
	}

	if reason := observation.ValidateFields(schema, fields); reason != "" {
		return observation.QuarantineReasonRegistryValidation + ": " + reason
	}
	return ""
}

func (s *ObservationService) resolveUser(ctx context.Context, dataSourceID uuid.UUID, payload map[string]any, resolution observation.EntityResolution) (uuid.UUID, string, error) {
	subject, ok := observation.GetPath(payload, resolution.SubjectSourcePath)
	if !ok || strings.TrimSpace(fmt.Sprint(subject)) == "" {
		return uuid.Nil, observation.QuarantineReasonUnresolvedUser, nil
	}
	externalID := strings.TrimSpace(fmt.Sprint(subject))

	identity, err := s.userIdentityRepo.GetByDataSourceAndExternalID(ctx, dataSourceID, externalID)
	if err == nil {
		return identity.UserID, "", nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return uuid.Nil, "", err
	}

	if strings.EqualFold(resolution.Strategy, observation.ResolveStrategyLookupOnly) {
		return uuid.Nil, observation.QuarantineReasonUnresolvedUser, nil
	}

	emailValue, ok := observation.GetPath(payload, resolution.EmailSourcePath)
	if !ok || strings.TrimSpace(fmt.Sprint(emailValue)) == "" {
		return uuid.Nil, observation.QuarantineReasonMissingEmail, nil
	}
	email := strings.ToLower(strings.TrimSpace(fmt.Sprint(emailValue)))

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, "", err
		}
		name := extractName(payload, email)
		newUser := &model.User{
			Email:  email,
			Name:   name,
			Status: "active",
		}
		if err := s.userRepo.Create(ctx, newUser); err != nil {
			if !repository.IsDuplicateKey(err) {
				return uuid.Nil, "", err
			}
			// Race with another create; load again.
			user, err = s.userRepo.GetByEmail(ctx, email)
			if err != nil {
				return uuid.Nil, "", err
			}
		} else {
			user = newUser
		}
	}

	namespace := strings.TrimSpace(resolution.Namespace)
	userIdentity := &model.UserIdentity{
		UserID:       user.ID,
		DataSourceID: dataSourceID,
		ExternalID:   externalID,
		Namespace:    nil,
	}
	if namespace != "" {
		userIdentity.Namespace = &namespace
	}
	if err := s.userIdentityRepo.Create(ctx, userIdentity); err != nil && !repository.IsDuplicateKey(err) {
		return uuid.Nil, "", err
	}
	return user.ID, "", nil
}

func extractName(payload map[string]any, email string) string {
	candidates := []string{"name", "full_name", "display_name", "student.name", "user.name"}
	for _, candidate := range candidates {
		if value, ok := observation.GetPath(payload, candidate); ok {
			name := strings.TrimSpace(fmt.Sprint(value))
			if name != "" {
				return name
			}
		}
	}
	at := strings.Index(email, "@")
	if at > 0 {
		return email[:at]
	}
	return email
}

func chooseObservationType(spec *observation.BindingSpec, binding *model.BindingRegistry) string {
	if spec != nil && strings.TrimSpace(spec.ObservationType) != "" {
		return strings.TrimSpace(spec.ObservationType)
	}
	return binding.ObservationType
}
