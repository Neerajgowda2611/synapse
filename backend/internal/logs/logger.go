package logs

import (
	"log/slog"
	"os"
)

var logger = slog.Default()

func New() *slog.Logger {
	logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	return logger
}

func Info(message string, args ...any) {
	logger.Info(message, args...)
}

func Error(message string, args ...any) {
	logger.Error(message, args...)
}
