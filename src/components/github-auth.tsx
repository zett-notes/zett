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
