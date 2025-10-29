package database

import (
	"fmt"

	"github.com/lib/pq"
)

type PgDetailedError struct {
	OriginalError error
	Message       string
	Code          string
	Detail        string
	Hint          string
	Where         string
	Table         string
	Column        string
	Constraint    string
	Query         string
	Params        any
}

func NewPgDetailedError(err error, query string, params interface{}) error {
	if err == nil {
		return nil
	}

	pqErr, ok := err.(*pq.Error)
	if !ok {
		return fmt.Errorf("database error: %w", err)
	}

	detailedErr := &PgDetailedError{
		OriginalError: err,
		Message:       pqErr.Message,
		Code:          string(pqErr.Code),
		Detail:        pqErr.Detail,
		Hint:          pqErr.Hint,
		Where:         pqErr.Where,
		Table:         pqErr.Table,
		Column:        pqErr.Column,
		Constraint:    pqErr.Constraint,
		Query:         query,
		Params:        params,
	}

	return detailedErr
}

func (e *PgDetailedError) Error() string {
	base := fmt.Sprintf("pq.Error: %s (Code: %s)\n", e.Message, e.Code)

	if e.Detail != "" {
		base += fmt.Sprintf("\tDetail: %s\n", e.Detail)
	}
	if e.Hint != "" {
		base += fmt.Sprintf("\tHint: %s\n", e.Hint)
	}
	if e.Where != "" {
		base += fmt.Sprintf("\tWhere: %s\n", e.Where)
	}
	if e.Table != "" {
		base += fmt.Sprintf("\tTable: %s\n", e.Table)
	}
	if e.Column != "" {
		base += fmt.Sprintf("\tColumn: %s\n", e.Column)
	}
	if e.Constraint != "" {
		base += fmt.Sprintf("\tConstraint: %s\n", e.Constraint)
	}
	if e.Query != "" {
		base += fmt.Sprintf("\tQuery: \n%s\n", e.Query)
	}
	if e.Params != nil {
		base += fmt.Sprintf("\tParams: %+v\n", e.Params)
	}

	return base
}

// func (e *PgDetailedError) Unwrap() error {
//     return e.OriginalError
// }
