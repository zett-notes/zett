import { useSetAtom } from "jotai"
import urlcat from "urlcat"
import { globalStateMachineAtom } from "../global-state"
import { Button, ButtonProps } from "./button"

interface DevTokenResponse {
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
        try {
          const response = await fetch("/dev-token")
          if (!response.ok) throw new Error("Failed to get token")
          const { token, login, name, email } = await response.json() as DevTokenResponse
          send({ type: "SIGN_IN", githubUser: { token, login, name, email } })
        } catch (error) {
          console.error(error)
        }
        props.onClick?.(event)
      }}
    >
      Sign in with GitHub
    </Button>
  )
}

export function useSignOut() {
  const send = useSetAtom(globalStateMachineAtom)

  return () => {
    send({ type: "SIGN_OUT" })
  }
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
