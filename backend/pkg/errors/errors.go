package errors

import (
	"errors"
	"fmt"
	"runtime/debug"
)

// StackError defines the interface for errors that carry stack traces
type StackError interface {
	Error() string
	Stack() []byte
}

func New(format string, args ...any) error {
	stack := debug.Stack()
	var msg string
	if len(args) > 0 {
		msg = fmt.Sprintf(format, args...)
	} else {
		msg = format
	}
	return &BaseError{
		msg:   msg,
		stack: stack,
	}
}

func Wrap(err error, format string, args ...any) error {
	if err == nil {
		return nil
	}

	var stack []byte
	// Check if the error already has a stack trace using our StackError interface
	if se, ok := err.(StackError); ok {
		existingStack := se.Stack()
		if len(existingStack) > 0 {
			stack = existingStack
		} else {
			stack = debug.Stack()
		}
	} else {
		stack = debug.Stack()
	}

	var msg string
	if len(args) > 0 {
		msg = fmt.Sprintf(format, args...)
	} else {
		msg = format
	}

	return &BaseError{
		msg:   msg,
		err:   err,
		stack: stack,
	}
}

// Is reports whether any error in err's chain matches target
func Is(err, target error) bool {
	return errors.Is(err, target)
}

// As finds the first error in err's chain that matches target
func As(err error, target any) bool {
	return errors.As(err, target)
}

// Unwrap returns the result of calling the Unwrap method on err
func Unwrap(err error) error {
	return errors.Unwrap(err)
}

// HasStack checks if an error has stack trace information
func HasStack(err error) bool {
	_, ok := err.(StackError)
	return ok
}

type BaseError struct {
	msg   string
	err   error
	stack []byte
}

func (e BaseError) Error() string {
	if e.err != nil {
		return fmt.Sprintf("%s: %v", e.msg, e.err)
	}
	return e.msg
}

func (e BaseError) Unwrap() error {
	return e.err
}

func (e BaseError) Format(f fmt.State, c rune) {
	switch c {
	case 'v':
		if f.Flag('+') {
			if e.err != nil {
				fmt.Fprintf(f, "%s: %v\n%s", e.msg, e.err, string(e.stack))
			} else {
				fmt.Fprintf(f, "%s\n%s", e.msg, string(e.stack))
			}
			return
		}
		fallthrough
	case 's':
		fmt.Fprintf(f, "%s", e.Error())
	}
}

func (e BaseError) Stack() []byte {
	return e.stack
}
