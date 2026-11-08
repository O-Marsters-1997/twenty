package store

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func uuidPtr(id pgtype.UUID) *string {
	if !id.Valid {
		return nil
	}
	value := id.String()
	return &value
}

func patchUUID(target *pgtype.UUID, id *string) error {
	if id == nil {
		return nil
	}
	parsed, err := optionalUUID(*id)
	if err != nil {
		return err
	}
	*target = parsed
	return nil
}

func patchText(target *pgtype.Text, value *string) {
	if value != nil {
		*target = text(*value)
	}
}

func timePtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	utc := value.Time.UTC()
	return &utc
}
