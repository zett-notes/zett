/// <reference lib="deno.ns" />

import type { Config } from "https://edge.netlify.com"

// Reference: https://github.com/isomorphic-git/cors-proxy

const ALLOW_HEADERS = [
  "accept-encoding",
  "accept-language",
  "accept",
  "access-control-allow-origin",
  "authorization",
  "cache-control",
  "connection",
  "content-length",
  "content-type",
  "dnt",
  "git-protocol",
  "pragma",
  "range",
  "referer",
  "user-agent",
  "x-authorization",
  "x-http-method-override",
  "x-requested-with",
]

const EXPOSE_HEADERS = [
  "accept-ranges",
  "age",
  "authorization",
  "cache-control",
  "content-length",
  "content-language",
  "content-type",
  "date",
  "etag",
  "expires",
  "last-modified",
  "location",
  "pragma",
  "server",
  "transfer-encoding",
  "vary",
  "x-github-request-id",
  "x-redirected-url",
]

export default async (request: Request) => {
  try {
    // The request URL will look like: "https://.../cors-proxy/example.com/..."
    // We want to strip off the "https://.../cors-proxy/" part of the URL
    // and proxy the request to the remaining URL.
    const url = request.url.replace(/^.*\/cors-proxy\//, "https://")

    console.log("Proxying request to:", url)
    console.log("Method:", request.method)
    console.log("Original headers:", Object.fromEntries(request.headers.entries()))

    // Filter request headers
    const requestHeaders = new Headers()
    for (const [key, value] of request.headers.entries()) {
      if (ALLOW_HEADERS.includes(key.toLowerCase())) {
        requestHeaders.set(key, value)
      }
    }

    // Set git-specific headers if this is a git request
    if (url.includes('git-upload-pack')) {
      requestHeaders.set('git-protocol', 'version=2')
      requestHeaders.set('accept', 'application/x-git-upload-pack-result')
      // Only set user-agent if not already set
      if (!requestHeaders.has('user-agent')) {
        requestHeaders.set('user-agent', 'git/lumen/cors-proxy')
      }
    } else {
      // For non-git requests, always set our user-agent
      requestHeaders.set('user-agent', 'git/lumen/cors-proxy')
    }

    console.log("Filtered headers:", Object.fromEntries(requestHeaders.entries()))

    const response = await fetch(url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
    })

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    // Filter response headers
    const responseHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (EXPOSE_HEADERS.includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }

    console.log("Filtered response headers:", Object.fromEntries(responseHeaders.entries()))

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return new Response(`Proxy error: ${error.message}`, { status: 500 })
  }
}

export const config: Config = {
  path: "/cors-proxy/*",
}
