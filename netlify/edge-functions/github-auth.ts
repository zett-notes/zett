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
      const authUrl = new URL("https://github.com/login/oauth/authorize")
      authUrl.searchParams.set("client_id", clientId)
      authUrl.searchParams.set("state", state)
      authUrl.searchParams.set("scope", "repo,gist,user:email")
      
      return Response.redirect(authUrl.toString())
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

    const { error, access_token: token } = await response.json()
    if (error || !token) {
      throw new Error(error || "No access token received")
    }

    // Get user info
    const { login, name, email } = await getUser(token)
    
    // Redirect back with user info
    const state = url.searchParams.get("state") || "/"
    const redirectUrl = new URL(state)
    redirectUrl.searchParams.set("user_token", token)
    redirectUrl.searchParams.set("user_login", login)
    redirectUrl.searchParams.set("user_name", name || "")
    redirectUrl.searchParams.set("user_email", email)
    
    return Response.redirect(redirectUrl.toString())
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
