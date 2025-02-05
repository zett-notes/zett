import { useSetAtom } from "jotai"
import urlcat from "urlcat"
import { globalStateMachineAtom, githubUserAtom } from "../global-state"
import { Button, ButtonProps } from "./button"
import { useSignOut } from "../hooks/use-sign-out"

// Types
export type SignInButtonProps = {
  className?: string
}

// Component exports
export function SignInButton({ className }: SignInButtonProps) {
  const send = useSetAtom(globalStateMachineAtom)
  const setGithubUser = useSetAtom(githubUserAtom)
  return (
    <Button
      variant="primary"
      className={className}
      onClick={async (event) => {
        // Sign in with a personal access token in local development
        if (import.meta.env.DEV && import.meta.env.VITE_GITHUB_PAT) {
          try {
            const token = import.meta.env.VITE_GITHUB_PAT
            const { login, name, email } = await getUser(token)
            const user = { token, login, name, email }
            setGithubUser(user)
            send({ type: "SIGN_IN", githubUser: user })
          } catch (error) {
            console.error(error)
          }
          return
        }

        window.location.href = urlcat("https://github.com/login/oauth/authorize", {
          client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
          state: window.location.href,
          scope: "repo,gist,user:email",
        })

        event.preventDefault()
      }}
    >
      Sign in with GitHub
    </Button>
  )
}

async function getUser(token: string) {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (userResponse.status === 401) {
    throw new Error("Invalid token")
  }

  if (!userResponse.ok) {
    throw new Error("Unknown error")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { login, name } = (await userResponse.json()) as any

  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (emailResponse.status === 401) {
    throw new Error("Invalid token")
  }

  if (!emailResponse.ok) {
    throw new Error("Error getting user's emails")
  }

  const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean }>
  const primaryEmail = emails.find((email) => email.primary)

  if (!primaryEmail) {
    throw new Error("No primary email found")
  }

  return { login, name, email: primaryEmail.email }
}
