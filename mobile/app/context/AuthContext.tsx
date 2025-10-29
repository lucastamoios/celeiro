import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { useMMKVNumber, useMMKVObject, useMMKVString } from "react-native-mmkv"

import { api } from "@/services/api"
import { OrganizationForSessionInfoResponse, SessionInfoResponse } from "@/services/api/accounts"

export interface AuthContextType {
  isAuthenticated: boolean
  authToken?: string
  authEmail?: string
  setAuthToken: (token?: string) => void
  setAuthEmail: (email: string) => void
  logout: () => void
  requestMagicLink: (email: string) => Promise<void>
  authenticate: (email: string, code: string) => Promise<void>
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
  const [authToken, setAuthToken] = useMMKVString("authToken")
  const [authEmail, setAuthEmail] = useMMKVString("authEmail")
  const [session, setSession] = useMMKVObject<SessionInfoResponse>("session")
  const [activeOrganizationID, setActiveOrganization] = useMMKVNumber("activeOrganization")

  const activeOrganization = useMemo(() => {
    return session?.organizations.find(
      (organization) => organization.organization_id === activeOrganizationID,
    )
  }, [session, activeOrganizationID])

  const [authCode, setAuthCode] = useState("")

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
        setAuthToken(res.data?.session_token)
        setSession(res.data?.session_info)
        const activeOrganizationID = res.data?.session_info?.organizations[0].organization_id
        setActiveOrganization(activeOrganizationID)
      } else {
        throw new Error("Código inválido")
      }
    },
    [setAuthToken, setSession],
  )

  const logout = useCallback(() => {
    setAuthToken(undefined)
    setAuthEmail("")
  }, [setAuthEmail, setAuthToken])

  const validationError = useMemo(() => {
    if (!authEmail || authEmail.length === 0) return "can't be blank"
    if (authEmail.length < 6) return "must be at least 6 characters"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) return "must be a valid email address"
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
