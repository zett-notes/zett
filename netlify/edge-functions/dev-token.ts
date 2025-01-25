import { Context } from "@netlify/edge-functions"

export default async (request: Request, context: Context) => {
  // Only in development
  if (!context.env.GITHUB_PAT) {
    return new Response("Not in development", { status: 403 })
  }

  const { login, name, email } = await getUser(context.env.GITHUB_PAT)
  return new Response(JSON.stringify({ token: context.env.GITHUB_PAT, login, name, email }), {
    headers: { "Content-Type": "application/json" }
  })
}

export const config = {
  path: "/dev-token"
}

interface GitHubUser {
  login: string
  name: string
  email: string
}

// Copy of the getUser function from github-auth.tsx to avoid duplication
async function getUser(token: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json() as Promise<GitHubUser>
}
