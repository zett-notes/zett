# Micromark v2 Handlers Update

## Problem

Current implementation of custom handlers in `remarkRehypeOptions` uses outdated approach from micromark v1:

1. Handlers use untyped parameters (`h: any, node: any`)
2. Direct manipulation of HTML elements through `h` function
3. No type safety for returned elements

This causes TypeScript errors after updating to micromark v2 and related packages:

```typescript:src/components/markdown.tsx
remarkRehypeOptions={{
  handlers: {
    wikilink(h: any, node: any): Element {
      // Untyped parameters, potential runtime errors
    }
  }
}}
```

## Solution

Update handlers to use micromark v2 approach:

1. Return properly typed `Element` objects directly
2. Add proper TypeScript types for handlers from `@types/hast` and `@types/mdast`
3. Remove dependency on `h` function

### Implementation Details

#### Modified Files

`src/components/markdown.tsx`:
```typescript
import type { Element } from 'hast'
import type { H } from '@types/mdast-util-to-hast'
import type { Node } from '@types/mdast'

remarkRehypeOptions={{
  handlers: {
    wikilink(h: H, node: Node): Element {
      return {
        type: 'element',
        tagName: 'a',
        properties: {
          href: `/${node.value}`,
          className: 'wikilink'
        },
        children: [{ type: 'text', value: node.value }]
      }
    },
    embed(h: H, node: Node): Element {
      return {
        type: 'element',
        tagName: 'div',
        properties: {
          className: 'embed'
        },
        children: [{ type: 'text', value: node.value }]
      }
    },
    tag(h: H, node: Node): Element {
      return {
        type: 'element',
        tagName: 'span',
        properties: {
          className: 'tag'
        },
        children: [{ type: 'text', value: node.value }]
      }
    }
  }
}}
```

### Testing

1. Basic functionality:
   - Create note with wikilinks (`[[note]]`)
   - Create note with embeds (`![[note]]`)
   - Create note with tags (`#tag`)
   - Expected: All elements render correctly
   - Time: ~5min

2. Edge cases:
   - Test wikilinks with spaces
   - Test embeds with special characters
   - Test tags with numbers
   - Expected: All cases handled properly
   - Time: ~10min

### References

1. [Micromark v2 Documentation](https://github.com/micromark/micromark)
2. [mdast-util-to-hast Documentation](https://github.com/syntax-tree/mdast-util-to-hast)
3. Related files:
   - `src/components/markdown.tsx`
   - `src/remark-plugins/wikilink.ts`
   - `src/remark-plugins/embed.ts`
   - `src/remark-plugins/tag.ts`

### Dependencies

Required package updates:
- `micromark`: 3.0.10 -> 4.0.1
- `micromark-util-types`: 1.0.2 -> 2.0.1
- `unified`: 10.1.2 -> 11.0.5
- `@types/hast`: ^3.0.0
- `@types/mdast`: ^4.0.0
- `@types/mdast-util-to-hast`: latest 