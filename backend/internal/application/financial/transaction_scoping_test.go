package financial

import (
	"strings"
	"testing"
)

// Transaction writes are scoped to the organization, never to the individual
// user. Celeiro is a shared family workspace: reads (list, fetch-by-id) are
// organization-scoped, so a member can see every account's transactions in the
// org. Gating the UPDATE/DELETE on accounts.user_id let a member open another
// member's transaction but fail to save it, because the statement matched zero
// rows and the handler returned a silent error.
//
// This guards against reintroducing that gate. It is a cheap structural check;
// a behavioral integration test (member B edits an account owned by member A in
// the same org) belongs in a repository test backed by the testcontainers
// harness and is tracked as a follow-up.
func TestTransactionWriteQueriesAreOrganizationScoped(t *testing.T) {
	queries := map[string]string{
		"modifyTransactionQuery": modifyTransactionQuery,
		"removeTransactionQuery": removeTransactionQuery,
	}

	for name, query := range queries {
		if strings.Contains(query, "a.user_id") {
			t.Errorf("%s gates on a.user_id; transaction writes must be organization-scoped so any org member can edit shared transactions", name)
		}
		if !strings.Contains(query, "a.organization_id") {
			t.Errorf("%s does not gate on a.organization_id; writes must stay scoped to the organization", name)
		}
	}
}
