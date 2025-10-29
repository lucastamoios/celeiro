# Authentication & Authorization System

Celeiro uses a **passwordless authentication** system with **role-based access control (RBAC)** built on organizations.

## Authentication Flow

### Magic Link (Passwordless) Authentication

Users authenticate via **magic codes** sent to their email (no passwords needed).

```
1. User enters email
2. System generates 4-digit code
3. Code stored in Redis (10-minute expiration)
4. Code sent via email
5. User enters code
6. System validates and creates session
```

**Benefits:**
- No password management
- Secure (codes expire in 10 minutes)
- Better UX (no forgot password flows)
- Auto-registration (new users created on first login)

### Auto-Registration

When a user authenticates with a new email:
1. **User created** with email as name
2. **Organization created** with email as name
3. **User linked to organization** with `regular_manager` role
4. **Session created** with user + organization context

## Authorization System

### Multi-Tenant Architecture

Celeiro supports **multi-organization** access:
- One user can belong to multiple organizations
- Each user-organization relationship has a **role**
- Roles define **permissions** within that organization

### Roles

| Role | Description | Use Case |
|------|-------------|----------|
| `admin` | Full system access | System administrators (future) |
| `regular_manager` | Manage organization users | Default role for new users |
| `regular_user` | View-only access | Limited users (future) |

### Permissions

Permissions are **actions** users can perform:

| Permission | Description |
|------------|-------------|
| `view_organizations` | View organization details |
| `edit_organizations` | Modify organization settings |
| `create_organizations` | Create new organizations |
| `delete_organizations` | Delete organizations |
| `view_regular_users` | View users in organization |
| `edit_regular_users` | Modify user details |
| `create_regular_users` | Invite new users |
| `delete_regular_users` | Remove users |

### Role-Permission Mapping

```
regular_manager:
  ├── view_regular_users
  ├── edit_regular_users
  ├── create_regular_users
  └── delete_regular_users

admin: (all permissions)
```

## Database Schema

### Core Tables

```sql
-- Roles (predefined)
CREATE TABLE roles (
    role_name VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions (predefined)
CREATE TABLE permissions (
    permission VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL REFERENCES roles(role_name),
    permission VARCHAR(255) NOT NULL REFERENCES permissions(permission),
    UNIQUE (role_name, permission)
);

-- Organizations (multi-tenant)
CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT 'User',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Organization membership
CREATE TABLE user_organizations (
    user_organization_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    user_role VARCHAR(255) NOT NULL REFERENCES roles(role_name)
);
```

## Session Management

Sessions are stored in **Redis** (transient database):

```go
type SessionInfo struct {
    UserID        int
    Email         string
    Name          string
    Organizations []OrganizationWithPermissions
}
```

**Session Flow:**
1. After authentication, `SessionInfo` created
2. Stored in Redis with UUID key
3. UUID returned as session token
4. Middleware validates token on each request
5. `SessionInfo` added to request context

## API Integration

### Protected Endpoints

Use the auth middleware to protect endpoints:

```go
router.Group(func(r chi.Router) {
    r.Use(middleware.RequireAuth)

    r.Get("/api/v1/accounts", handler.ListAccounts)
    r.Post("/api/v1/transactions/import", handler.ImportOFX)
})
```

### Accessing User Context

Get authenticated user from context:

```go
func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
    session := contextual.GetSession(r.Context())

    // Access user info
    userID := session.UserID
    orgID := session.Organizations[0].OrganizationID

    // Fetch user-specific data
    accounts, err := h.service.ListByUser(ctx, userID, orgID)
}
```

## Security Considerations

### Magic Code Security

- **4-digit code** (10,000 combinations)
- **10-minute expiration** (limits brute-force window)
- **Single use** (code deleted after validation)
- **Stored in Redis** (not database for faster expiration)

### Session Security

- **UUID tokens** (cryptographically random)
- **Redis storage** (faster than DB + auto-expiration)
- **No sensitive data** in token (just UUID reference)
- **HTTPS only** in production

### RBAC Security

- **Permissions checked at service layer** (not just middleware)
- **Organization isolation** (users can't access other org data)
- **Role enforcement** (can't escalate own permissions)

## Code Examples

### Authentication

```go
// Request magic link
output, err := service.RequestMagicLinkViaEmail(ctx, RequestMagicLinkViaEmailInput{
    Email: "user@example.com",
    CheckUserExists: false, // Allow new users
})

// Authenticate with code
auth, err := service.AuthenticateWithMagicCode(ctx, AuthenticateWithMagicCodeInput{
    Email: "user@example.com",
    Code:  "1234",
})

// auth.Session contains token
// auth.IsNewUser indicates if user was just created
```

### Authorization

```go
// Check permission
func (s *Service) DeleteUser(ctx context.Context, userID int) error {
    session := contextual.GetSession(ctx)

    // Check if user has permission
    if !session.HasPermission("delete_regular_users") {
        return errors.New("permission denied")
    }

    // Verify user belongs to same organization
    if !session.BelongsToOrganization(organizationID) {
        return errors.New("access denied")
    }

    // Proceed with deletion
    return s.repo.DeleteUser(ctx, userID)
}
```

## Future Enhancements

### Planned Features

1. **Refresh tokens** - Long-lived sessions with token rotation
2. **2FA support** - Optional second factor for sensitive operations
3. **OAuth providers** - Google, GitHub login
4. **API keys** - For programmatic access
5. **Audit logs** - Track permission usage
6. **Custom roles** - Organization-defined roles
7. **Invitation system** - Invite users to organization with specific roles

### Migration Path

Current system is designed to support **single-user** use:
- Each user gets their own organization (auto-created)
- Future: Add UI to manage multiple organizations
- Future: Add invitation flow to join existing organizations

For now, **1 user = 1 organization = perfect for personal finance tracking**.
