package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type noteRow struct {
	baseRow
	Title           *string `json:"title"`
	BodyV2Blocknote *string `json:"bodyV2Blocknote"`
	BodyV2Markdown  *string `json:"bodyV2Markdown"`
}

type Notes struct {
	*table[noteRow, records.Note]
}

var _ records.Notes = (*Notes)(nil)

func NewNotes(pool *pgxpool.Pool) *Notes {
	return &Notes{newTable(pool, "note", toNote, func(note records.Note) string { return note.ID })}
}

func (n *Notes) Create(ctx context.Context, actor records.Actor, input records.NoteInput) (records.Note, error) {
	return n.create(ctx, actor, noteValues(input))
}

func (n *Notes) Update(ctx context.Context, actor records.Actor, id string, input records.NoteInput) (records.Note, error) {
	return n.update(ctx, actor, id, noteValues(input))
}

func noteValues(input records.NoteInput) map[string]any {
	values := map[string]any{}
	if input.Title != nil {
		values["title"] = *input.Title
	}
	setRichText(values, "bodyV2", input.Body)
	return values
}

func setRichText(values map[string]any, column string, body *records.RichText) {
	if body != nil {
		values[column+"Blocknote"], values[column+"Markdown"] = body.Blocknote, body.Markdown
	}
}

func toNote(row noteRow) records.Note {
	return records.Note{
		ID: row.ID, Title: deref(row.Title), Body: records.RichText{Blocknote: deref(row.BodyV2Blocknote), Markdown: deref(row.BodyV2Markdown)},
		Position: row.Position, CreatedBy: row.createdBy(), UpdatedBy: row.updatedBy(),
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt,
	}
}
