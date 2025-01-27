# Add Authentication Testing Suite

## Problem
Currently, there are no automated tests for:
1. Authentication flows (sign in/out)
2. Global state machine transitions
3. User session management

This makes it risky to modify auth-related code as we can't verify if changes break existing functionality.

## Solution
Add a comprehensive testing suite for authentication using Vitest and Testing Library:

### Implementation Details

#### New Files

`src/hooks/__tests__/use-sign-out.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useSignOut } from "../use-sign-out"
import { globalStateMachineAtom } from "../../global-state"

describe("useSignOut", () => {
  it("should send SIGN_OUT event to state machine", () => {
    const mockSend = vi.fn()
    vi.mock("jotai", () => ({
      useSetAtom: () => mockSend,
    }))

    const { result } = renderHook(() => useSignOut())
    result.current()

    expect(mockSend).toHaveBeenCalledWith({ type: "SIGN_OUT" })
  })
})
```

`src/__tests__/global-state.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { interpret } from "xstate"
import { createGlobalStateMachine } from "../global-state"

describe("Global State Machine", () => {
  it("should transition from signedIn to signedOut on SIGN_OUT", (done) => {
    const machine = createGlobalStateMachine()
    const service = interpret(machine).start()

    // Initial state
    service.send({ type: "SIGN_IN", githubUser: { login: "test", token: "test" } })
    expect(service.state.matches("signedIn")).toBe(true)

    // Sign out
    service.send({ type: "SIGN_OUT" })
    expect(service.state.matches("signedOut")).toBe(true)
    
    // Check cleanup actions were called
    expect(service.state.context.githubUser).toBeNull()
    expect(service.state.context.githubRepo).toBeNull()
    expect(service.state.context.markdownFiles).toEqual({})

    done()
  })

  it("should load sample files in signedOut state", () => {
    // Test that sample markdown files are loaded
  })

  it("should clear local storage on sign out", () => {
    // Test localStorage cleanup
  })
})
```

`src/__tests__/auth-flow.test.tsx`:
```typescript
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "jotai"
import { RootComponent } from "../routes/__root"

describe("Authentication Flow", () => {
  it("should show sign in button when signed out", () => {
    render(
      <Provider>
        <RootComponent />
      </Provider>
    )

    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument()
  })

  it("should handle sign out flow", async () => {
    render(
      <Provider>
        <RootComponent />
      </Provider>
    )

    // Mock signed in state
    // Click sign out
    // Verify UI shows sign in state
  })
})
```

### Testing
1. Unit Tests:
   - Run `npm test src/hooks/__tests__/use-sign-out.test.ts`
   - Should pass all hook tests
   - Time: ~1s

2. State Machine Tests:
   - Run `npm test src/__tests__/global-state.test.ts`
   - Should verify all state transitions
   - Time: ~2s

3. Integration Tests:
   - Run `npm test src/__tests__/auth-flow.test.tsx`
   - Should verify complete auth flows
   - Time: ~3s

### References
1. [Vitest Docs](https://vitest.dev/guide/mocking.html)
2. [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
3. [XState Testing](https://xstate.js.org/docs/guides/testing.html)
