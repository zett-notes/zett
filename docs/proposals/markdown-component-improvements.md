# Markdown Component Improvements

## Problem
The current Markdown component implementation has several areas that could be improved:

1. Custom components lack proper TypeScript types and rely on type assertions
2. Error handling is minimal and doesn't gracefully handle component failures
3. Performance optimizations are missing for some components
4. Testing coverage for edge cases is incomplete

**User impact:**
- Developers face TypeScript errors and need to use type assertions
- Users might see cryptic errors when content fails to render
- Large documents might experience performance issues

**Technical limitations:**
- react-markdown types don't support custom components natively
- No error boundaries for component-level failures
- Missing memoization for expensive operations

## Solution

### High-level approach
1. Improve TypeScript types and remove unnecessary type assertions
2. Add proper error handling with ErrorBoundary
3. Implement performance optimizations
4. Add comprehensive testing

### Technical architecture
1. Custom components will be properly typed using React.ComponentType
2. ErrorBoundary will wrap markdown rendering
3. useMemo and React.memo will be used for optimization
4. Storybook tests will cover edge cases

### User experience changes
- Better error messages when content fails to render
- Improved performance for large documents
- No visible changes to normal operation

## Implementation Details

### Modified Files

`src/components/markdown.tsx`:
```typescript
import { ErrorBoundary } from 'react-error-boundary'
import type { ExtraProps } from 'react-markdown'

// 1. Better type definitions
type CustomComponents = {
  wikilink: React.ComponentType<{ id: string; text: string }>
  embed: React.ComponentType<{ id: string; text: string }>
  tag: React.ComponentType<{ name: string }>
}

// 2. Error Boundary component
function MarkdownErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<div className="text-text-danger">Failed to render markdown content</div>}
      onError={(error) => console.error('Markdown render error:', error)}
    >
      {children}
    </ErrorBoundary>
  )
}

// 3. Optimized component implementation
export const Markdown = React.memo(function Markdown({ children, hideFrontmatter = false }: MarkdownProps) {
  const components = useMemo(() => ({
    // Standard components
    a: Anchor,
    img: Image,
    input: CheckboxInput,
    li: ListItem,
    pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    code: Code,
    // Custom components with proper types
    wikilink: ({ id, text }: { id: string; text: string }) => (
      <NoteLink id={id} text={text} />
    ),
    embed: ({ id, text }: { id: string; text: string }) => (
      <NoteEmbed id={id} text={text} />
    ),
    tag: ({ name }: { name: string }) => (
      <TagLink name={name} />
    ),
  }), [])

  return (
    <MarkdownErrorBoundary>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </MarkdownErrorBoundary>
  )
})
```

### Testing

1. Basic functionality (15min):
   - Render markdown with different content types
   - Verify all components render correctly
   - Check error boundary catches failures

2. Performance testing (30min):
   - Render large documents (>1000 lines)
   - Measure render time with React DevTools
   - Verify memoization works

3. Edge cases (45min):
   - Test malformed markdown
   - Test broken links/embeds
   - Test with missing permissions
   - Test with offline state

4. Accessibility testing (30min):
   - Verify screen reader compatibility
   - Check keyboard navigation
   - Test high contrast mode

## References

1. [react-markdown documentation](https://github.com/remarkjs/react-markdown#appendix-b-components)
2. [React Error Boundary docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
3. Related code: `src/components/markdown.tsx`
4. Related code: `src/components/note-preview.tsx` 