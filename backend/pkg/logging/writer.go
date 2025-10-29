package logging

import (
	"net/http"

	pkgerrors "github.com/catrutech/celeiro/pkg/errors"
)

type ResponseWriter struct {
	http.ResponseWriter
	Error *pkgerrors.BaseError
	// Other attributes to be logged
}

func (rw *ResponseWriter) SetError(error *pkgerrors.BaseError) {
	rw.Error = error
}

func (rw *ResponseWriter) GetError() *pkgerrors.BaseError {
	return rw.Error
}
