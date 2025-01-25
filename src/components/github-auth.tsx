import { useSetAtom } from "jotai"
import urlcat from "urlcat"
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
  return (
    <Button
      variant="primary"
      {...props}
      onClick={async (event) => {
        window.location.href = urlcat("https://github.com/login/oauth/authorize", {
          client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
          state: window.location.href,
          scope: "repo,gist,user:email",
        })

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
