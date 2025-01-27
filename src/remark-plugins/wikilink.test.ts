import { micromark } from "micromark"
import { expect, test } from "vitest"
import { wikilink, wikilinkHtml } from "./wikilink"

function runTests(tests: Array<{ input: string; output: string }>) {
  for (const { input, output } of tests) {
    test(input, () => {
      const html = micromark(input, {
        extensions: [wikilink()],
        htmlExtensions: [wikilinkHtml()],
      })
      expect(html).toBe(output)
    })
  }
}

runTests([
  // Valid wikilinks
  {
    input: `[[123]]`,
    output: `<p><wikilink id="123" text="" value="123" /></p>`,
  },
  {
    input: `[[[123]]]`,
    output: `<p>[<wikilink id="123" text="" value="123" />]</p>`,
  },
  {
    input: `[[[[123]]]]`,
    output: `<p>[[<wikilink id="123" text="" value="123" />]]</p>`,
  },
  {
    input: `\`\`\`
[[123]]
\`\`\``,
    output: `<pre><code>[[123]]
</code></pre>`,
  },
  {
    input: `\`[[123]]\``,
    output: `<p><code>[[123]]</code></p>`,
  },
  {
    input: `_[[123]]_`,
    output: `<p><em><wikilink id="123" text="" value="123" /></em></p>`,
  },
  {
    input: `- [[123]]`,
    output: `<ul>
<li><wikilink id="123" text="" value="123" /></li>
</ul>`,
  },
  {
    input: `[[123|hello]]`,
    output: `<p><wikilink id="123" text="hello" value="123" /></p>`,
  },
  {
    input: `[[123|hello world]]`,
    output: `<p><wikilink id="123" text="hello world" value="123" /></p>`,
  },
  {
    input: `[[123|hello]] [[456]]`,
    output: `<p><wikilink id="123" text="hello" value="123" /> <wikilink id="456" text="" value="456" /></p>`,
  },
  {
    input: `[[123x]]`,
    output: `<p><wikilink id="123x" text="" value="123x" /></p>`,
  },
  {
    input: `[[x]]`,
    output: `<p><wikilink id="x" text="" value="x" /></p>`,
  },
  {
    input: `[[x|y]]`,
    output: `<p><wikilink id="x" text="y" value="x" /></p>`,
  },
  {
    input: `[[Hello world|foo]]`,
    output: `<p><wikilink id="Hello world" text="foo" value="Hello world" /></p>`,
  },
  {
    input: `[[foo.bar]]`,
    output: `<p><wikilink id="foo.bar" text="" value="foo.bar" /></p>`,
  },

  // Invalid wikilinks
  {
    input: `hello`,
    output: `<p>hello</p>`,
  },
  {
    input: `[`,
    output: `<p>[</p>`,
  },
  {
    input: `[[`,
    output: `<p>[[</p>`,
  },
  {
    input: `[[]]`,
    output: `<p>[[]]</p>`,
  },
  {
    input: `[[123]`,
    output: `<p>[[123]</p>`,
  },
  {
    input: `[[123`,
    output: `<p>[[123</p>`,
  },
  {
    input: `[123]]`,
    output: `<p>[123]]</p>`,
  },
  {
    input: `123]]`,
    output: `<p>123]]</p>`,
  },
  {
    input: `[123]`,
    output: `<p>[123]</p>`,
  },
  {
    input: `[[123|]]`,
    output: `<p>[[123|]]</p>`,
  },
])
