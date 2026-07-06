import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { api } from "@/services/api"
import { OrganizationForSessionInfoResponse, SessionInfoResponse } from "@/services/api/accounts"
import { load, loadString, remove, save, saveString } from "@/utils/storage"

export interface AuthContextType {
  isAuthenticated: boolean
  authToken?: string
  authEmail?: string
  setAuthToken: (token?: string) => void
  setAuthEmail: (email: string) => void
  logout: () => void
  requestMagicLink: (email: string) => Promise<void>
  authenticate: (email: string, code: string) => Promise<void>
  loginWithPassword: (email: string, password: string) => Promise<void>
  validationError: string
  step: "request" | "validate"
  authCode: string
  setAuthCode: (code: string) => void
  session: SessionInfoResponse | undefined
  activeOrganization: OrganizationForSessionInfoResponse | undefined
  setActiveOrganization: (organizationID: number) => void
}
export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const [step, setStep] = useState<"request" | "validate">("request")
  const [authToken, setAuthTokenState] = useState<string | undefined>()
  const [authEmail, setAuthEmailState] = useState("")
  const [session, setSessionState] = useState<SessionInfoResponse | undefined>()
  const [activeOrganizationID, setActiveOrganizationState] = useState<number | undefined>()

  useEffect(() => {
    void Promise.all([
      loadString("authToken"),
      loadString("authEmail"),
      load<SessionInfoResponse>("session"),
      loadString("activeOrganization"),
    ]).then(([storedToken, storedEmail, storedSession, storedOrganization]) => {
      setAuthTokenState(storedToken ?? undefined)
      setAuthEmailState(storedEmail ?? "")
      setSessionState(storedSession ?? undefined)
      setActiveOrganizationState(storedOrganization ? Number(storedOrganization) : undefined)
    })
  }, [])

  const setAuthToken = useCallback((token?: string) => {
    setAuthTokenState(token)
    if (token) saveString("authToken", token)
    else remove("authToken")
  }, [])

  const setAuthEmail = useCallback((email: string) => {
    setAuthEmailState(email)
    saveString("authEmail", email)
  }, [])

  const setSession = useCallback((nextSession?: SessionInfoResponse) => {
    setSessionState(nextSession)
    if (nextSession) save("session", nextSession)
    else remove("session")
  }, [])

  const setActiveOrganization = useCallback((organizationID: number) => {
    setActiveOrganizationState(organizationID)
    saveString("activeOrganization", String(organizationID))
  }, [])

  const activeOrganization = useMemo(() => {
    return session?.organizations.find(
      (organization) => organization.organization_id === activeOrganizationID,
    )
  }, [session, activeOrganizationID])

  const [authCode, setAuthCode] = useState("")

  const applyAuthentication = useCallback(
    (sessionToken?: string, sessionInfo?: SessionInfoResponse) => {
      setAuthToken(sessionToken)
      setSession(sessionInfo)
      const activeOrganizationID = sessionInfo?.organizations[0]?.organization_id
      if (activeOrganizationID) {
        setActiveOrganization(activeOrganizationID)
      }
    },
    [setActiveOrganization, setAuthToken, setSession],
  )

  const requestMagicLink = useCallback(
    async (email: string) => {
      if (email.length === 0) return

      setAuthEmail(email)

      const res = await api.requestMagicLink({ email })
      if (res.status === 200) {
        setStep("validate")
      } else {
        throw new Error("Something went wrong")
      }
    },
    [setAuthEmail],
  )

  const authenticate = useCallback(
    async (email: string, code: string) => {
      const res = await api.authenticate({ email, code })
      if (res.status === 200) {
        applyAuthentication(res.data?.session_token, res.data?.session_info)
      } else {
        throw new Error("Código inválido")
      }
    },
    [applyAuthentication],
  )

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await api.authenticateWithPassword({ email, password })
      if (res.status === 200) {
        setAuthEmail(email)
        applyAuthentication(res.data?.session_token, res.data?.session_info)
      } else {
        throw new Error(res.message || "Email ou senha invalidos")
      }
    },
    [applyAuthentication, setAuthEmail],
  )

  const logout = useCallback(() => {
    setAuthToken(undefined)
    setAuthEmail("")
    setSession(undefined)
    remove("activeOrganization")
    setActiveOrganizationState(undefined)
  }, [setAuthEmail, setAuthToken, setSession])

  const validationError = useMemo(() => {
    if (!authEmail || authEmail.length === 0) return "Informe seu email"
    if (authEmail.length < 6) return "O email parece curto demais"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) return "Informe um email valido"
    return ""
  }, [authEmail])

  const value = {
    isAuthenticated: !!authToken,
    authToken,
    authEmail,
    setAuthToken,
    setAuthEmail,
    logout,
    requestMagicLink,
    authenticate,
    loginWithPassword,
    validationError,
    step,
    authCode,
    setAuthCode,
    session,
    activeOrganization,
    setActiveOrganization,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
