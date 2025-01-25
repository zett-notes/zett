import { useSetAtom } from "jotai"
import { globalStateMachineAtom } from "../global-state"
import { Button, ButtonProps } from "./button"

interface GitHubUser {
  token: string
  login: string
  name: string
  email: string
}

export function SignInButton(props: ButtonProps) {
  const send = useSetAtom(globalStateMachineAtom)

  const handleAuth = async (event: React.MouseEvent) => {
    try {
      // Try PAT auth first (development)
      const response = await fetch("/github-auth")
      if (response.ok) {
        const user = await response.json() as GitHubUser
        send({ type: "SIGN_IN", githubUser: user })
        return
      }

      // If PAT fails, start OAuth flow (production)
      const state = window.location.href
      window.location.href = `/github-auth?state=${encodeURIComponent(state)}`
    } catch (error) {
      console.error("Auth failed:", error)
    }
    props.onClick?.(event)
  }

  return (
    <Button variant="primary" {...props} onClick={handleAuth}>
      Sign in with GitHub
    </Button>
  )
}

export function useSignOut() {
  const send = useSetAtom(globalStateMachineAtom)
  return () => send({ type: "SIGN_OUT" })
}

// Handle OAuth callback
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search)
  const token = params.get("user_token")
  const login = params.get("user_login")
  const name = params.get("user_name")
  const email = params.get("user_email")

  if (token && login && email) {
    const globalState = window as any
    if (!globalState.authProcessed) {
      globalState.authProcessed = true // Prevent double processing
      const send = useSetAtom(globalStateMachineAtom)
      send({ 
        type: "SIGN_IN", 
        githubUser: { token, login, name: name || login, email } 
      })
      
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete("user_token")
      url.searchParams.delete("user_login")
      url.searchParams.delete("user_name")
      url.searchParams.delete("user_email")
      window.history.replaceState({}, "", url.toString())
    }
  }
}
