/// <reference lib="deno.ns" />

export default async (request: Request) => {
  try {
    const url = new URL(request.url)

    // Development mode: use PAT
    if (Deno.env.get("GITHUB_PAT")) {
      const token = Deno.env.get("GITHUB_PAT")
      const { login, name, email } = await getUser(token)
      return new Response(JSON.stringify({ token, login, name, email }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // Production mode: OAuth flow
    const code = url.searchParams.get("code")
    if (!code) {
      // No code = initial auth request, redirect to GitHub
      const clientId = Deno.env.get("GITHUB_CLIENT_ID")
      if (!clientId) {
        return new Response("GitHub Client ID not configured", { status: 403 })
      }

      const state = url.searchParams.get("state") || "/"
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${encodeURIComponent(state)}&scope=repo,gist,user:email`
      )
    }

    // Exchange code for token
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: Deno.env.get("GITHUB_CLIENT_ID"),
        client_secret: Deno.env.get("GITHUB_CLIENT_SECRET"),
        code,
      }),
    })

    const data = await response.json()
    if (data.error || !data.access_token) {
      throw new Error(data.error || "No access token received")
    }

    // Get user info
    const { login, name, email } = await getUser(data.access_token)
    
    // Get state (return URL)
    const state = url.searchParams.get("state") || "/"
    const returnUrl = new URL(state)
    
    // Add user info to URL
    returnUrl.searchParams.set("user_token", data.access_token)
    returnUrl.searchParams.set("user_login", login)
    returnUrl.searchParams.set("user_name", name || "")
    returnUrl.searchParams.set("user_email", email)
    
    return Response.redirect(returnUrl.toString())

  } catch (error) {
    console.error("Auth error:", error)
    return new Response(error.message, { status: 500 })
  }
}

interface GitHubUser {
  login: string
  name: string
  email: string
}

async function getUser(token: string): Promise<GitHubUser> {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` }
  })
  
  if (!userResponse.ok) {
    throw new Error("Failed to get GitHub user")
  }
  
  const { login, name } = await userResponse.json()
  
  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${token}` }
  })
  
  if (!emailResponse.ok) {
    throw new Error("Failed to get GitHub emails")
  }
  
  const emails = await emailResponse.json()
  const primaryEmail = emails.find((e: any) => e.primary && e.verified)
  if (!primaryEmail) {
    throw new Error("No verified primary email found")
  }
  
  return { login, name: name || login, email: primaryEmail.email }
}

export const config = {
  path: "/github-auth"
}
