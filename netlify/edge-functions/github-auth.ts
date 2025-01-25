/// <reference lib="deno.ns" />

import { Context } from "@netlify/edge-functions"

export default async (request: Request, context: Context) => {
  try {
    if (!context.env.GITHUB_PAT) {
      return new Response("GitHub PAT not configured", { status: 403 })
    }

    const { login, name, email } = await getUser(context.env.GITHUB_PAT)
    return new Response(JSON.stringify({ token: context.env.GITHUB_PAT, login, name, email }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(error.message, { status: 500 })
  }
}

interface GitHubUser {
  login: string
  name: string
  email: string
}

async function getUser(token: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    throw new Error("Failed to get GitHub user")
  }
  return response.json()
}

export const config = {
  path: "/github-auth"
}
