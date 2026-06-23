package postgres

func IsPostgresSlug(slug string) bool {
	return slug == "postgres" || slug == "postgresql"
}
