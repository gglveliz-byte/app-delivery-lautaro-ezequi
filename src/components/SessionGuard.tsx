import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { getSession, useSessionSync } from "@/hooks/useSessionSync"
import { useCustomerSession } from "@/hooks/useCustomerSession"
import { Loader2 } from "lucide-react"

type GuardRole = "customer" | "admin" | "merchant" | "driver"

export default function SessionGuard({ role, children }: { role: GuardRole; children: ReactNode }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useCustomerSession()
  const [checking, setChecking] = useState(true)
  const redirected = useRef(false)

  const redirectOut = useCallback(() => {
    if (redirected.current) return
    redirected.current = true
    // Only clear the specific session flag, not all storage
    localStorage.removeItem("qs_session")
    if (role === "customer") navigate("/customer-login", { replace: true })
    else navigate("/login", { replace: true })
  }, [role, navigate])

  const handleSessionChange = useCallback((session: any) => {
    if (!session || session.role !== role) {
      redirectOut()
    }
  }, [role, redirectOut])

  useSessionSync(handleSessionChange)

  // For customer role: wait for checkAuth to resolve
  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== role) {
      redirectOut()
      // NO setChecking(false) aquí — mantener loader hasta que navigate tome efecto
      return
    }

    if (role !== "customer") {
      setChecking(false)
      return
    }

    // Customer needs auth check from context - let it resolve naturally
    if (isAuthenticated) {
      setChecking(false)
      return
    }

    // Wait for checkAuth to resolve without aggressive timeout
    const timer = setTimeout(() => {
      setChecking(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [role, isAuthenticated, redirectOut])

  // Once isAuthenticated becomes true, stop checking
  useEffect(() => {
    if (role === "customer" && isAuthenticated) setChecking(false)
  }, [role, isAuthenticated])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2E7D32]" />
      </div>
    )
  }

  return <>{children}</>
}
