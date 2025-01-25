import { Root, Text, PhrasingContent } from "mdast"
import { Extension as FromMarkdownExtension, Handle, Token, CompileContext } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol/codes"
import {
  Code,
  Extension,
  HtmlExtension,
  State,
  Tokenizer,
  Previous,
  Construct,
} from "micromark-util-types"
import { Plugin, Processor } from "unified"
import { Node } from "unist"

interface TagNode extends Node {
  type: "tag"
  value: string
  children: []
  data: {
    hName: string
    hProperties: {
      className: string[]
    }
  }
}

declare module "mdast" {
  interface PhrasingContentMap {
    tag: TagNode
  }
}

declare module "unified" {
  interface Nodes {
    tag: TagNode
  }
}

declare module "micromark-util-types" {
  interface TokenTypeMap {
    tag: "tag"
    tagMarker: "tagMarker"
    tagName: "tagName"
    escape: "escape"
  }
  
  interface Nodes {
    tag: TagNode
  }
}

const types = {
  tag: "tag",
  tagMarker: "tagMarker",
  tagName: "tagName",
} as const

/** Syntax extension (text -> tokens) */
export function tag(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    const enter: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.enter('escape')
        effects.consume(code)
        return escapeStart
      }
      
      if (isMarkerChar(code)) {
        effects.enter(types.tag)
        effects.enter(types.tagMarker)
        effects.consume(code)
        effects.exit(types.tagMarker)
        effects.enter(types.tagName)
        effects.enter('chunkString', {contentType: 'string'})
        return continueName
      }
      return nok(code)
    }

    const escapeStart: State = function(code: Code): State | undefined {
      if (code === codes.numberSign) {
        effects.consume(code)
        effects.exit('escape')
        return enter
      }
      return nok(code)
    }

    const continueName: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInName
      }
      
      if (isNameChar(code)) {
        effects.consume(code)
        return continueName
      }
      
      if (code === codes.space || code === codes.eof || code === codes.carriageReturn || code === codes.lineFeed) {
        effects.exit('chunkString')
        effects.exit(types.tagName)
        effects.exit(types.tag)
        return ok(code)
      }
      return nok(code)
    }

    const escapeInName: State = function(code: Code): State | undefined {
      if (code === codes.backslash || isNameChar(code)) {
        effects.consume(code)
        return continueName
      }
      return continueName(code)
    }

    return enter
  }

  const previous: Previous = (code) => {
    return (
      code === codes.space ||
      code === codes.carriageReturn ||
      code === codes.lineFeed ||
      code === codes.carriageReturnLineFeed ||
      code === codes.eof
    )
  }

  const construct: Construct = {
    name: "tag",
    tokenize,
    previous,
  }

  return {
    text: {
      [codes.numberSign]: construct,
      [codes.backslash]: construct,
    },
  }
}

/** HTML extension (tokens -> HTML) */
export function tagHtml(): HtmlExtension {
  return {
    enter: {
      tagName(token) {
        const name = this.sliceSerialize(token)
        this.raw(`<tag>${name}</tag>`)
      }
    }
  }
}

/** MDAST extension (tokens -> MDAST) */
export function tagFromMarkdown(): FromMarkdownExtension {
  const enter: Handle = function(this: CompileContext, token: Token) {
    if (token.type === "tag") {
      const node: TagNode = {
        type: "tag",
        value: "",
        children: [],
        data: {
          hName: "tag",
          hProperties: {
            className: ["tag"]
          }
        }
      }
      // @ts-ignore - we know this is safe because we've declared the type in mdast
      this.enter(node, token)
    } else if (token.type === "tagName") {
      const textNode: Text = { type: "text", value: "" }
      this.enter(textNode, token)
      this.exit(token)
    }
  }

  const exit: Handle = function(this: CompileContext, token: Token) {
    if (token.type === "tag") {
      this.exit(token)
    } else if (token.type === "tagName") {
      const node = this.stack[this.stack.length - 1] as PhrasingContent
      if ('type' in node && node.type === "tag") {
        const name = this.sliceSerialize(token)
        ;(node as TagNode).value = name
      }
    }
  }

  return {
    enter: {
      tag: enter,
      tagName: enter
    },
    exit: {
      tag: exit,
      tagName: exit
    }
  }
}

function isMarkerChar(code: Code): boolean {
  return code !== null && code === codes.numberSign
}

function isAlphaChar(code: Code): boolean {
  return code !== null && (
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    (code >= codes.uppercaseA && code <= codes.uppercaseZ)
  )
}

function isNameChar(code: Code): boolean {
  return code !== null && (
    isAlphaChar(code) ||
    (code >= codes.digit0 && code <= codes.digit9) ||
    code === codes.dash ||
    code === codes.underscore
  )
}

export function remarkTag(): Plugin<[Options?], Root> {
  return function(this: Processor) {
    const add = (field: string, value: unknown) => {
      const data = this.data() as Record<string, unknown[]>
      const list = data[field] ? data[field] : (data[field] = [])
      list.push(value)
    }

    add("micromarkExtensions", tag())
    add("fromMarkdownExtensions", tagFromMarkdown())
    add("toMarkdownExtensions", tagHtml())

    return (tree: Root) => tree
  }
}

interface Options {}
