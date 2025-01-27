# Changelog 2025-01-27 #002

## [FEAT] Add ReloadPrompt Component for PWA Updates

### Problem
Currently, users have no visual feedback when:
1. The app is ready to work offline
2. A new version of the app is available for installation

### Solution
Add a new `ReloadPrompt` component based on Vite PWA documentation that:
1. Shows a toast when the app is ready for offline use
2. Shows a toast with "Reload" button when updates are available
3. Uses our design system (Button, colors, shadows)

### Implementation Details

#### New Files
`src/components/reload-prompt.tsx`:
```tsx
import React from "react"
import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "./button"

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return

      console.debug("Service Worker registered successfully")

      // Check for updates every hour
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    },
    onRegisterError(error) {
      console.error("SW registration error", error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-0 right-0 m-4 flex flex-col gap-2 rounded-lg border border-border bg-bg p-4 shadow-lg">
      <div className="text-sm text-text">
        {offlineReady ? (
          <span>App ready to work offline</span>
        ) : (
          <span>New content available. Click reload to update.</span>
        )}
      </div>
      <div className="flex gap-2">
        {needRefresh && (
          <Button size="small" onClick={() => updateServiceWorker(true)}>
            Reload
          </Button>
        )}
        <Button size="small" variant="secondary" onClick={close}>
          Close
        </Button>
      </div>
    </div>
  )
}
```

#### Modified Files
`src/routes/__root.tsx`:
```tsx
import { ReloadPrompt } from "../components/reload-prompt"

// Add to RootComponent return
<div>
  <ScrollRestoration />
  <CommandMenu />
  <ReloadPrompt />
</div>
```

### Testing
1. Test "offline ready":
   - Open app first time
   - Should see "App ready to work offline" toast
   - Time: ~30s

2. Test "new content":
   - Change any code (e.g. text in ReloadPrompt)
   - Wait for Vite build
   - Should see "New content available" toast
   - Click "Reload" to update
   - Time: ~1-2min

3. Test offline mode:
   - Chrome DevTools -> Network -> check "Offline"
   - Refresh page
   - App should still work
   - Time: ~1-2min

### References
1. [Vite PWA React Docs](https://vite-pwa-org.netlify.app/frameworks/react.html#prompt-for-update)
2. [workbox-window Update Behavior](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates)
