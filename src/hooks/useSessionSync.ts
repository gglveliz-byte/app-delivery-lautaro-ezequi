import { useEffect, useCallback } from "react"

const SESSION_KEY = "qs_session"

export interface SessionInfo {
  role: "customer" | "admin" | "merchant" | "driver"
  ts: number
}

export function getSession(): SessionInfo | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(role: SessionInfo["role"]) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, ts: Date.now() }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function useSessionSync(onChange: (session: SessionInfo | null) => void) {
  const handleStorage = useCallback(
    (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        const session = e.newValue ? JSON.parse(e.newValue) : null
        onChange(session)
      }
    },
    [onChange]
  )

  useEffect(() => {
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [handleStorage])
}
