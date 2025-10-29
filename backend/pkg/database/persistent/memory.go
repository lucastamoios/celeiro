package database

import (
	"context"
	"fmt"
	"reflect"
	"regexp"
	"strings"
)

type ExpectedCall struct {
	Query  string
	Args   []interface{}
	Result interface{}
	Error  error
	Called bool
}

type MemoryDatabase struct {
	expectedCalls []*ExpectedCall
	currentCall   int
	strict        bool
}

func NewMemoryDatabase() *MemoryDatabase {
	return &MemoryDatabase{
		expectedCalls: make([]*ExpectedCall, 0),
		currentCall:   0,
		strict:        true,
	}
}

func (m *MemoryDatabase) SetStrict(strict bool) {
	m.strict = strict
}

func (m *MemoryDatabase) ExpectQuery(query string, args ...interface{}) *ExpectedCall {
	call := &ExpectedCall{
		Query:  normalizeQuery(query),
		Args:   args,
		Called: false,
	}
	m.expectedCalls = append(m.expectedCalls, call)
	return call
}

func (call *ExpectedCall) WillReturn(result interface{}) *ExpectedCall {
	call.Result = result
	return call
}

func (call *ExpectedCall) WillReturnError(err error) *ExpectedCall {
	call.Error = err
	return call
}

func (m *MemoryDatabase) Run(ctx context.Context, query string, args ...any) error {
	return nil
}

func (m *MemoryDatabase) Query(ctx context.Context, dest any, query string, args ...any) error {
	normalizedQuery := normalizeQuery(query)
	if m.currentCall >= len(m.expectedCalls) {
		if m.strict {
			return fmt.Errorf("unexpected query call: %s", normalizedQuery)
		}
		return nil
	}

	expectedCall := m.expectedCalls[m.currentCall]
	expectedCall.Called = true

	if m.strict && expectedCall.Query != normalizedQuery {
		return fmt.Errorf("expected query: %s, got: %s", expectedCall.Query, normalizedQuery)
	}

	if m.strict && !argsEqual(expectedCall.Args, args) {
		return fmt.Errorf("expected args: %v, got: %v", expectedCall.Args, args)
	}

	m.currentCall++

	if expectedCall.Error != nil {
		return expectedCall.Error
	}

	if expectedCall.Result != nil {
		return m.setResult(dest, expectedCall.Result)
	}

	return nil
}

func (m *MemoryDatabase) Tx(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

func (m *MemoryDatabase) Reset() {
	m.expectedCalls = make([]*ExpectedCall, 0)
	m.currentCall = 0
}

func (m *MemoryDatabase) ExpectationsWereMet() error {
	for i, call := range m.expectedCalls {
		if !call.Called {
			return fmt.Errorf("expected call %d was not made: %s", i, call.Query)
		}
	}
	return nil
}

func (m *MemoryDatabase) setResult(dest interface{}, result interface{}) error {
	destValue := reflect.ValueOf(dest)
	if destValue.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}

	destValue = destValue.Elem()
	resultValue := reflect.ValueOf(result)

	if destValue.Kind() == reflect.Slice {
		if resultValue.Kind() != reflect.Slice {
			return fmt.Errorf("result must be a slice when dest is a slice")
		}
		destValue.Set(resultValue)
		return nil
	}

	if resultValue.Kind() == reflect.Slice && resultValue.Len() > 0 {
		destValue.Set(resultValue.Index(0))
		return nil
	}

	if resultValue.Kind() == reflect.Ptr && destValue.Kind() != reflect.Ptr {
		if resultValue.IsNil() {
			return fmt.Errorf("cannot assign nil pointer to non-pointer")
		}
		resultValue = resultValue.Elem()
	}

	if resultValue.Kind() != reflect.Ptr && destValue.Kind() == reflect.Ptr {
		newPtr := reflect.New(resultValue.Type())
		newPtr.Elem().Set(resultValue)
		destValue.Set(newPtr)
		return nil
	}

	if destValue.Type() != resultValue.Type() {
		return fmt.Errorf("type mismatch: cannot assign %v to %v", resultValue.Type(), destValue.Type())
	}

	destValue.Set(resultValue)
	return nil
}

func normalizeQuery(query string) string {
	// Remove SQL comments first
	// Remove single-line comments (-- comment)
	singleLineCommentRe := regexp.MustCompile(`--.*`)
	query = singleLineCommentRe.ReplaceAllString(query, "")

	// Remove multi-line comments (/* comment */)
	multiLineCommentRe := regexp.MustCompile(`/\*[\s\S]*?\*/`)
	query = multiLineCommentRe.ReplaceAllString(query, "")

	// Normalize whitespace using regex
	// Replace multiple whitespace characters (spaces, tabs, newlines) with single space
	whitespaceRe := regexp.MustCompile(`\s+`)
	normalized := whitespaceRe.ReplaceAllString(query, " ")

	// Trim leading and trailing spaces
	return strings.TrimSpace(normalized)
}

func argsEqual(expected []interface{}, actual []interface{}) bool {
	if len(expected) != len(actual) {
		return false
	}
	for i := range expected {
		if !reflect.DeepEqual(expected[i], actual[i]) {
			return false
		}
	}
	return true
}
