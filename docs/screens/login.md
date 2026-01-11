# Login Screen

**File:** `frontend/src/components/Login.tsx`

## Purpose

Authentication entry point supporting two methods: Magic Link and Password.

## What the User Sees

### Auth Mode Toggle

Tab-style toggle between:
- **Magic Link** (default): Passwordless email authentication
- **Senha**: Traditional email + password

### Magic Link Flow

**Step 1: Email**
- Email input field
- "Enviar código" button
- Hint: "Enviaremos um código de 4 dígitos para seu email"

**Step 2: Code**
- 4-digit code input (large, centered, monospace)
- "Entrar" button
- "← Voltar" link to return to email step
- Success message: "Enviamos um código de 4 dígitos para seu email!"

### Password Flow

Single form with:
- Email input
- Password input (min 8 characters)
- "Entrar" button
- Hint: "Não tem senha? Use Magic Link para entrar e configure sua senha nas configurações."

### Error Display

Red alert box for:
- Invalid/expired code
- Invalid credentials
- Network errors

## Auto-Login

If URL contains `?email=X&code=Y`:
1. Extracts parameters
2. Clears URL (no page reload)
3. Attempts automatic login
4. On failure, shows code step with error

## API Endpoints

| Action | Endpoint |
|--------|----------|
| Request magic link | `POST /auth/request-code` |
| Validate code | `POST /auth/validate` |
| Password login | `POST /auth/login` |

## Business Rules

1. **Code Format**: 4 numeric digits
2. **Password Minimum**: 8 characters
3. **Session Storage**: Token stored via `AuthContext.login()`
4. **URL Params**: Processed once on mount, then cleared

## Click Behaviors

| Element | Action |
|---------|--------|
| "Magic Link" tab | Switches to magic link mode, resets password |
| "Senha" tab | Switches to password mode |
| "Enviar código" | Sends code request, advances to code step |
| "Entrar" (code) | Validates code and logs in |
| "Entrar" (password) | Authenticates with email/password |
| "← Voltar" | Returns to email step, clears code |

## Post-Login

On successful authentication:
1. Calls `login(token, email)` from `useAuth`
2. App redirects to Dashboard (handled by `App.tsx`)
