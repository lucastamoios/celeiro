package accounts

import (
	"net/http"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
)

type AccountsHandler interface {
	Me(w http.ResponseWriter, r *http.Request)
	AccountsAuthHandler
}

type handler struct {
	accountsService  accounts.Service
	financialService financial.Service
}

func NewHandler(application *application.Application) AccountsHandler {
	return &handler{
		accountsService:  application.AccountsService,
		financialService: application.FinancialService,
	}
}

// Me
func (h *handler) Me(w http.ResponseWriter, r *http.Request) {
	session, err := h.accountsService.GetSessionFromContext(r.Context())
	if err != nil {
		responses.NewError(w, errors.ErrUnauthorized)
		return
	}

	me := SessionInfoResponse{}.FromDTO(&session.Info, false)
	responses.NewSuccess(me, w)
}
