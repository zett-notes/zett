# React 19 Features Implementation

## Problem
Currently, our app uses React 18.2.0 which doesn't provide access to the latest features that could improve our code quality and developer experience. Specifically, we're missing out on:
- More type-safe way of handling data in components
- Better event handling with TypeScript integration
- Improved metadata management

## Solution
Implement three key React 19 features that will enhance our development workflow:

1. Resource Components
2. Actions
3. Document Metadata

### Implementation Details

#### Resource Components
Replace current HTML attributes with new Resource Components pattern:

```typescript
// Before
<wikilink id="123" text="hello" value="123" />

// After
<Wikilink 
  resource={{ 
    id: "123", 
    text: "hello", 
    value: "123" 
  }} 
/>
```

#### Actions
Update event handling to use the new Actions API:

```typescript
// Before
<button onClick={(e) => handleClick(e)}>Click me</button>

// After
<button action={(e) => {
  // Type-safe event handling
  return {
    type: 'click',
    payload: e
  }
}}>Click me</button>
```

#### Document Metadata
Replace data attributes with new metadata prop:

```typescript
// Before
<tag name="hello" data-meta="tag-meta" />

// After
<Tag 
  name="hello" 
  meta={{
    type: 'tag',
    attributes: ['meta']
  }} 
/>
```

### Testing
1. Resource Components:
   - Create new components using resource prop
   - Verify type safety with TypeScript
   - Test data flow and updates
   - Time: ~30min

2. Actions:
   - Update existing event handlers
   - Test type inference
   - Verify event propagation
   - Time: ~30min

3. Document Metadata:
   - Convert data attributes to meta prop
   - Test metadata access in components
   - Verify SSR compatibility
   - Time: ~30min

### References
1. React 19 Documentation (when available)
2. Related files:
   - `src/remark-plugins/wikilink.ts`
   - `src/remark-plugins/embed.ts`
   - `src/remark-plugins/tag.ts`

## Note
This proposal focuses only on the new React 19 features implementation. The actual upgrade process and breaking changes will be documented in a separate proposal. 