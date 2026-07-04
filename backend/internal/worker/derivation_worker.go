package worker

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/service"
)

type DerivationWorker struct {
	svc         *service.DerivationService
	interval    time.Duration
	concurrency int
	batchSize   int
	lookback    time.Duration
	stopCh      chan struct{}
	doneCh      chan struct{}
}

func NewDerivationWorker(svc *service.DerivationService, interval time.Duration, concurrency int) *DerivationWorker {
	if concurrency <= 0 {
		concurrency = 5
	}
	return &DerivationWorker{
		svc:         svc,
		interval:    interval,
		concurrency: concurrency,
		batchSize:   concurrency * 4,
		lookback:    24 * time.Hour,
		stopCh:      make(chan struct{}),
		doneCh:      make(chan struct{}),
	}
}

func (w *DerivationWorker) Start() {
	go w.loop()
}

func (w *DerivationWorker) Stop() {
	close(w.stopCh)
	<-w.doneCh
}

func (w *DerivationWorker) loop() {
	defer close(w.doneCh)
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

func (w *DerivationWorker) runBatch() {
	ctx := context.Background()
	users, err := w.svc.ListRecentUsers(ctx, time.Now().UTC().Add(-w.lookback), w.batchSize)
	if err != nil {
		logs.Error("derivation worker failed to list users", "error", err.Error())
		return
	}
	if len(users) == 0 {
		return
	}

	logs.Info("derivation worker processing users", "count", len(users))

	sem := make(chan struct{}, w.concurrency)
	var wg sync.WaitGroup
	for _, userID := range users {
		wg.Add(1)
		go func(uid uuid.UUID) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := w.svc.DeriveForUser(ctx, uid, time.Now().UTC(), "worker:periodic-backfill"); err != nil {
				logs.Error("derivation worker processing failed", "user_id", uid.String(), "error", err.Error())
			}
		}(userID)
	}
	wg.Wait()
}
