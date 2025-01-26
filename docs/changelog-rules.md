# Changelog Rules v2

## Core Principles
1. **One Change, One File**
   - Each changelog documents a single logical change
   - Keep changes focused and atomic
   - Split large changes into smaller, related ones

2. **Technical Focus**
   - Write for developers
   - Include actual code, errors, commands
   - Use proper TypeScript/React conventions

## File Structure
```
changelogs/
└── 2025/
    └── 01/
        └── 26/
            └── CHANGELOG_2025_01_26_001.md
```

## Required Sections

### 1. Header
```markdown
# Changelog YYYY-MM-DD #NNN

## [X.Y.Z] - YYYY-MM-DD
```

### 2. Change Entry Types
Each change must have one of these tags:
- `[CONF]` - Configuration changes (TypeScript, ESLint, etc.)
- `[FEAT]` - New features
- `[FIX]` - Bug fixes
- `[PERF]` - Performance improvements
- `[DEPS]` - Dependency updates
- `[DOCS]` - Documentation
- `[STYLE]` - Visual/CSS changes
- `[TEST]` - Test updates
- `[BREAKING]` - Breaking changes

### 3. Required Components

#### Before
- Show the problematic/old code
- Include file path and line numbers
- Show relevant configuration
- **Always use full relative paths from project root**
```typescript:src/components/auth/login/index.ts:10-15  # NOT just index.ts!
// Show the actual code that was causing issues
// or the old implementation that needed change
```

#### Why
- Show exact error messages
- Include performance metrics if relevant
- Link to issues/discussions
- **Include full stack traces with file paths**
```
Error: The exact error message that led to the change
at Object.<anonymous> (src/components/auth/login/index.ts:12:3)  # Full path!
```

#### Changed
- Show complete code changes with context
- Include all affected files with **full paths from project root**
- Document configuration updates
- List new dependencies with versions

#### For UI Changes
- Add Storybook tests (required for all UI changes)
- Include before/after screenshots
- Document Tailwind changes with:
  ```css:src/styles/components/button.css
  .button-primary {
    @apply bg-primary-500 hover:bg-primary-600;  # Show exact Tailwind changes
  }
  ```
- Test in all themes (light/dark)
- Add accessibility tests
- Include responsive behavior changes

#### Version Control
- Reference GitHub issues/PRs: `Fixes #123`
- Include migration steps for breaking changes
- Link to related documentation
- Add upgrade guide for major changes

## Code Examples

### File Paths
❌ Don't use ambiguous paths:
```
index.ts
utils.ts
types/index.ts
```

✅ Always use full paths from project root:
```
src/components/auth/login/index.ts
src/utils/date-formatter.ts
src/types/auth/index.ts
```

### Configuration
```typescript:tsconfig.json  # Root config files can be referenced directly
{
  "compilerOptions": {
    "target": "esnext",
    "moduleResolution": "bundler",  // Show relevant changes
    "jsx": "react-jsx"
  }
}
```

### Component Changes
```typescript:src/components/auth/login/LoginButton.tsx:15-25  # Full path!
export function LoginButton({ children, ...props }: LoginButtonProps) {
  // Show the changed implementation
  return (
    <button 
      className={cx(
        "px-4 py-2 rounded",
        "bg-primary text-white"
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Storybook Tests
```typescript:src/components/Button.stories.tsx
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    await expect(button).toBeInTheDocument()
  }
}
```

### Dependencies
```bash
npm install react@19.0.0 react-dom@19.0.0
npm install @radix-ui/react-dialog@1.1.5
```

## Real Example

```markdown
# Changelog 2025-01-26 #001

## [0.1.0] - 2025-01-26

### [CONF] TypeScript and Vite Configuration Fix

#### Before
TypeScript config caused Vite build errors:
```typescript:tsconfig.json:5
{
  "compilerOptions": {
    "moduleResolution": "node"  // Old setting causing issues
  }
}
```

#### Why
Vite build failed with error:
```
Error: The type of 'defineConfig' cannot be inferred from usage.
Consider adding an explicit type to the config object
at /Users/dev/project/vite.config.ts:3:21
```

#### Changed
1. Updated TypeScript configuration:
```typescript:tsconfig.json:5
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // Fixed setting for Vite
  }
}
```

2. Applied same change to Node config:
```typescript:tsconfig.node.json:5
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

**Impact:**
- Fixed TypeScript build errors
- Improved Vite compatibility
- No breaking changes

**Files Changed:**
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
```

## Key Points
1. Write for developers - show actual code, errors, commands
2. Focus on technical details - future you needs to understand what and why
3. Include context - show before/after state
4. Be specific - exact versions, file paths, line numbers
5. Test thoroughly - especially UI and breaking changes
6. Document everything - but keep it technical and concise 