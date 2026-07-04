package worker

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/service"
)

const staleProcessingAge = 15 * time.Minute

// ObservationWorker periodically drains received observations that were not
// processed by the immediate post-ingest goroutine (e.g. crash, race, overload).
type ObservationWorker struct {
	svc         *service.ObservationService
	interval    time.Duration
	concurrency int
	batchSize   int
	stopCh      chan struct{}
	doneCh      chan struct{}
}

func NewObservationWorker(svc *service.ObservationService, interval time.Duration, concurrency int) *ObservationWorker {
	if concurrency <= 0 {
		concurrency = 5
	}
	return &ObservationWorker{
		svc:         svc,
		interval:    interval,
		concurrency: concurrency,
		batchSize:   concurrency,
		stopCh:      make(chan struct{}),
		doneCh:      make(chan struct{}),
	}
}

func (w *ObservationWorker) Start() {
	go w.loop()
}

func (w *ObservationWorker) Stop() {
	close(w.stopCh)
	<-w.doneCh
}

func (w *ObservationWorker) loop() {
	defer close(w.doneCh)

	// Run once at startup to drain backlog quickly.
	w.runBatch()

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			w.runBatch()
		case <-w.stopCh:
			return
		}
	}
}

func (w *ObservationWorker) runBatch() {
	ctx := context.Background()

	released, err := w.svc.ReleaseStaleProcessing(ctx, staleProcessingAge)
	if err != nil {
		logs.Error("observation worker failed to release stale processing rows", "error", err.Error())
	} else if released > 0 {
		logs.Info("observation worker released stale processing rows", "count", released)
	}

	ids, err := w.svc.ClaimReceivedBatch(ctx, w.batchSize)
	if err != nil {
		logs.Error("observation worker failed to claim received rows", "error", err.Error())
		return
	}
	if len(ids) == 0 {
		return
	}

	logs.Info("observation worker processing batch", "count", len(ids))

	sem := make(chan struct{}, w.concurrency)
	var wg sync.WaitGroup
	for _, id := range ids {
		wg.Add(1)
		go func(observationID uuid.UUID) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := w.svc.ProcessObservation(ctx, observationID); err != nil {
				logs.Error(
					"observation worker processing failed",
					"observation_id", observationID.String(),
					"error", err.Error(),
				)
			}
		}(id)
	}
	wg.Wait()
}
