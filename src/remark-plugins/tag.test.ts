import { micromark } from "micromark"
import { expect, test } from "vitest"
import { tag, tagHtml } from "./tag"

function runTests(tests: Array<{ input: string; output: string }>) {
  for (const { input, output } of tests) {
    test(input, () => {
      const html = micromark(input, {
        extensions: [tag()],
        htmlExtensions: [tagHtml()],
      })
      expect(html).toBe(output)
    })
  }
}

runTests([
  // Valid tag links
  {
    input: `#hello`,
    output: `<p><tag name="hello" value="hello" /></p>`,
  },
  {
    input: `#HELLO`,
    output: `<p><tag name="HELLO" value="HELLO" /></p>`,
  },
  {
    input: `# #hello`,
    output: `<h1><tag name="hello" value="hello" /></h1>`,
  },
  {
    input: `#hello#world`,
    output: `<p><tag name="hello" value="hello" />#world</p>`,
  },
  {
    input: `#hello #world`,
    output: `<p><tag name="hello" value="hello" /> <tag name="world" value="world" /></p>`,
  },
  {
    input: `hello #world`,
    output: `<p>hello <tag name="world" value="world" /></p>`,
  },
  {
    input: `hello

#world`,
    output: `<p>hello</p>
<p><tag name="world" value="world" /></p>`,
  },
  {
    input: `#hello-world`,
    output: `<p><tag name="hello-world" value="hello-world" /></p>`,
  },
  {
    input: `#hello_world`,
    output: `<p><tag name="hello_world" value="hello_world" /></p>`,
  },
  {
    input: `#tag0123456789`,
    output: `<p><tag name="tag0123456789" value="tag0123456789" /></p>`,
  },
  {
    input: `#hello!`,
    output: `<p><tag name="hello" value="hello" />!</p>`,
  },
  {
    input: `#hello world`,
    output: `<p><tag name="hello" value="hello" /> world</p>`,
  },
  {
    input: `- #hello`,
    output: `<ul>
<li><tag name="hello" value="hello" /></li>
</ul>`,
  },
  {
    input: `> #hello`,
    output: `<blockquote>
<p><tag name="hello" value="hello" /></p>
</blockquote>`,
  },

  // Valid non-English tag links
  // {
  //   input: `#こんにちは`,
  //   output: `<p><tag name="こんにちは" /></p>`,
  // },
  {
    input: `#Привет`,
    output: `<p><tag name="Привет" value="Привет" /></p>`,
  },
  {
    input: `#שלום`,
    output: `<p><tag name="שלום" value="שלום" /></p>`,
  },
  {
    input: `#مرحبا`,
    output: `<p><tag name="مرحبا" value="مرحبا" /></p>`,
  },
  {
    input: `#नमस्ते`,
    output: `<p><tag name="नमस्ते" value="नमस्ते" /></p>`,
  },
  {
    input: `#안녕하세요`,
    output: `<p><tag name="안녕하세요" value="안녕하세요" /></p>`,
  },
  {
    input: `#Γειάσου`,
    output: `<p><tag name="Γειάσου" value="Γειάσου" /></p>`,
  },
  {
    input: `#Բարեւ`,
    output: `<p><tag name="Բարեւ" value="Բարեւ" /></p>`,
  },
  // {
  //   input: `#ሰላም`,
  //   output: `<p><tag name="ሰላም" /></p>`,
  // },
  {
    input: `#Здравствуйте`,
    output: `<p><tag name="Здравствуйте" value="Здравствуйте" /></p>`,
  },
  // {
  //   input: `#สวัสดี`,
  //   output: `<p><tag name="สวัสดี" /></p>`,
  // },
  {
    input: `#xinchào`,
    output: `<p><tag name="xinchào" value="xinchào" /></p>`,
  },
  {
    input: `#안녕하세요`,
    output: `<p><tag name="안녕하세요" value="안녕하세요" /></p>`,
  },
  {
    input: `#chào`,
    output: `<p><tag name="chào" value="chào" /></p>`,
  },

  // Invalid tag links
  {
    input: `#`,
    output: `<h1></h1>`,
  },
  {
    input: `# hello`,
    output: `<h1>hello</h1>`,
  },
  {
    input: `&#39;`,
    output: `<p>'</p>`,
  },
  {
    input: `![#hello](https://example.com/image.png)`,
    output: `<p><img src="https://example.com/image.png" alt="#hello" /></p>`,
  },
  {
    input: `[#hello](https://example.com)`,
    output: `<p><a href="https://example.com">#hello</a></p>`,
  },
  {
    input: `[link](#hello)`,
    output: `<p><a href="#hello">link</a></p>`,
  },
  {
    input: `_#hello_`,
    output: `<p><em>#hello</em></p>`,
  },
  {
    input: `__#hello__`,
    output: `<p><strong>#hello</strong></p>`,
  },
  {
    input: `#0123456789`,
    output: `<p>#0123456789</p>`,
  },
  {
    input: `\`\`\`
#hello
\`\`\``,
    output: `<pre><code>#hello
</code></pre>`,
  },
  {
    input: `\\#hello`,
    output: `<p>#hello</p>`,
  },
  {
    input: `##hello`,
    output: `<p>##hello</p>`,
  },
  {
    input: `#你好!`,
    output: `<p><tag name="你好" value="你好" />!</p>`,
  },
  {
    input: `#مرحبا!`,
    output: `<p><tag name="مرحبا" value="مرحبا" />!</p>`,
  },
  // {
  //   input: `#こんにちは!`,
  //   output: `<p><tag name="こんにちは" />!</p>`,
  // },
  {
    input: `#Γειάσου!`,
    output: `<p><tag name="Γειάσου" value="Γειάσου" />!</p>`,
  },
  {
    input: `#Привет!`,
    output: `<p><tag name="Привет" value="Привет" />!</p>`,
  },
])
