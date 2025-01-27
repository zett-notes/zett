import { useSetAtom } from "jotai"
import { globalStateMachineAtom } from "../global-state"

// Export hook as a function (Vite 6 best practice)
export function useSignOut() {
  const send = useSetAtom(globalStateMachineAtom)
  return () => {
    send({ type: "SIGN_OUT" })
  }
}