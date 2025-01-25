import { useSetAtom } from "jotai"
import { globalStateMachineAtom } from "../global-state"
import { Button, ButtonProps } from "./button"

export function SignInButton(props: ButtonProps) {
  return (
    <Button
      variant="primary"
      {...props}
      onClick={(event) => {
        // Let edge function handle the redirect
        window.location.href = `/github-auth?state=${encodeURIComponent(window.location.href)}`
        props.onClick?.(event)
      }}
    >
      Sign in with GitHub
    </Button>
  )
}

export function useSignOut() {
  const send = useSetAtom(globalStateMachineAtom)
  return () => send({ type: "SIGN_OUT" })
}

// Handle OAuth callback in a component
export function OAuthCallback() {
  const send = useSetAtom(globalStateMachineAtom)

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("user_token")
    const login = params.get("user_login")
    const name = params.get("user_name")
    const email = params.get("user_email")

    if (token && login && email) {
      // Prevent double processing using a global flag
      const w = window as typeof window & { _authProcessed?: boolean }
      if (!w._authProcessed) {
        w._authProcessed = true
        
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

  return null
}
