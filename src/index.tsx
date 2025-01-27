import "@fontsource-variable/literata/wght-italic.css"
import "@fontsource-variable/literata/wght.css"
import * as Tooltip from "@radix-ui/react-tooltip"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import "@total-typescript/ts-reset"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import "./styles/index.css"
import http from 'isomorphic-git/http/web'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Add test function to window object
async function testHttp() {
  console.log('Testing isomorphic-git HTTP adapter...')
  
  // Test bez proxy
  console.log('Testing without proxy...')
  try {
    const response1 = await http.request({
      url: 'https://github.com/screenfluent/notes.git/info/refs?service=git-upload-pack',
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'git/isomorphic-git',
      }
    })
    console.log('Direct response:', response1)
  } catch (error) {
    console.error('Direct request failed:', error)
  }
  
  // Test z proxy
  console.log('Testing with proxy...')
  try {
    const proxyUrl = 'https://cors.isomorphic-git.org/https://github.com/screenfluent/notes.git/info/refs?service=git-upload-pack'
    console.log('Using proxy URL:', proxyUrl)
    const response2 = await http.request({
      url: proxyUrl,
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'git/isomorphic-git',
        'Authorization': 'Bearer ' + import.meta.env.VITE_GITHUB_PAT,
      }
    })
    console.log('Proxy response:', response2)
  } catch (error) {
    console.error('Proxy request failed:', error)
  }
}

;(window as any).testHttp = testHttp

// Render the app
const rootElement = document.getElementById("root")!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <Tooltip.Provider>
        <RouterProvider router={router} />
      </Tooltip.Provider>
    </StrictMode>,
  )
}
