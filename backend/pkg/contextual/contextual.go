package contextual

import (
	"context"
)

const (
	APIErrorKey           = "api_error"
	SessionKey            = "session"
	ActiveOrganizationKey = "active_organization"
)

func SetAPIError(ctx context.Context, err error) context.Context {
	return context.WithValue(ctx, APIErrorKey, err)
}

func GetAPIError(ctx context.Context) error {
	err, ok := ctx.Value(APIErrorKey).(error)
	if !ok {
		return nil
	}
	return err
}

func GetSession(ctx context.Context) any {
	return ctx.Value(SessionKey)
}

func SetSession(ctx context.Context, session any) context.Context {
	return context.WithValue(ctx, SessionKey, session)
}

func GetActiveOrganization(ctx context.Context) any {
	return ctx.Value(ActiveOrganizationKey)
}

func SetActiveOrganization(ctx context.Context, organizationID any) context.Context {
	return context.WithValue(ctx, ActiveOrganizationKey, organizationID)
}
