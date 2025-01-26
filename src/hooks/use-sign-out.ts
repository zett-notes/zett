import { useSetAtom } from "jotai"
import { githubUserAtom } from "../global-state"

// Export hook as a function (Vite 6 best practice)
export function useSignOut() {
  const setGithubUser = useSetAtom(githubUserAtom)
  return () => setGithubUser(null)
} 