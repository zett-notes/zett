declare module "micromark-util-types" {
  interface TokenTypeMap {
    tag: "tag"
    tagMarker: "tagMarker"
    tagName: "tagName"
  }
}

import { Root } from "mdast"
import { Extension as FromMarkdownExtension, Token } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol/codes"
import {
  Code,
  Construct,
  Extension,
  HtmlExtension,
  Previous,
  State,
  Tokenizer,
  TokenType,
} from "micromark-util-types"
import { Plugin } from "unified"
import { Node } from "unist" // Removed import { VFile } from "vfile"
// Removed unused interface Options

/** Syntax extension (text -> tokens) */
export function tag(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    return enter

    function enter(code: Code): State | undefined {
      if (isMarkerChar(code)) {
        effects.enter("tag" as TokenType)
        effects.enter("tagMarker" as TokenType)
        effects.consume(code)
        effects.exit("tagMarker" as TokenType)
        return enterName
      } else {
        return nok(code)
      }
    }

    function enterName(code: Code): State | undefined {
      if (isAlphaChar(code)) {
        effects.enter("tagName" as TokenType)
        effects.consume(code)
        return continueName
      } else {
        return nok(code)
      }
    }

    function continueName(code: Code): State | undefined {
      if (isNameChar(code)) {
        effects.consume(code)
        return continueName
      } else {
        effects.exit("tagName" as TokenType)
        effects.exit("tag" as TokenType)
        return ok(code)
      }
    }
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
    },
  }
}

/** Returns true if character is valid tag marker */
function isMarkerChar(code: Code): boolean {
  return code === codes.numberSign
}

/** Returns true if character is in the English or extended alphabets (to allow certain unicode letters) */
function isAlphaChar(code: Code): boolean {
  if (code === null) return false
  return (
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
    (code >= 0x00c0 && code <= 0x00d6) ||
    (code >= 0x00d8 && code <= 0x00f6) ||
    (code >= 0x00f8 && code <= 0x00ff) ||
    (code >= 0x0100 && code <= 0x017f) ||
    (code >= 0x0180 && code <= 0x024f) ||
    (code >= 0x0370 && code <= 0x03ff) ||
    (code >= 0x0400 && code <= 0x04ff) ||
    (code >= 0x0530 && code <= 0x058f) ||
    (code >= 0x0590 && code <= 0x05ff) ||
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0900 && code <= 0x097f) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af)
  )
}

/** Returns true if character is a numeric digit */
function isNumberChar(code: Code): boolean {
  if (code === null) return false
  return code >= codes.digit0 && code <= codes.digit9
}

/** Returns true if character is valid in tag names */
function isNameChar(code: Code): boolean {
  if (code === null) return false
  return (
    isAlphaChar(code) ||
    isNumberChar(code) ||
    code === codes.underscore ||
    code === codes.dash ||
    code === codes.slash
  )
}

/**
 * HTML extension (tokens -> HTML)
 * This is only used for unit testing
 */
export function tagHtml(): HtmlExtension {
  return {
    enter: {
      tagName(token: Token) {
        const name = this.sliceSerialize(token)
        this.tag(`<tag name="${name}" />`)
      },
    },
  }
}

// Register tag as an mdast node type
interface Tag extends Node {
  type: "tag"
  value: string
  data: { name: string }
}

declare module "mdast" {
  interface StaticPhrasingContentMap {
    tag: Tag
  }
}

/** MDAST extension (tokens -> MDAST) */
export function tagFromMarkdown(): FromMarkdownExtension {
  let name: string | undefined

  return {
    enter: {
      tag(token: Token) {
        const node = { type: "tag", value: "", data: { name: "" } } as Tag
        // @ts-ignore - we know this is safe because we've defined the Tag type
        this.enter(node, token)
      },
      tagName(token: Token) {
        name = this.sliceSerialize(token)
      },
    },
    exit: {
      tag(token: Token) {
        const node = this.stack[this.stack.length - 1] as unknown as Tag
        node.data.name = name || ""
        node.value = `#${name}`
        this.exit(token)
        name = undefined
      },
    },
  }
}

/**
 * Remark plugin
 * Safely add micromark and fromMarkdown extensions to this.data().
 */
export function remarkTag(): ReturnType<Plugin<[], Root>> {
  // @ts-ignore - we know this will be bound to the processor instance
  const data = this.data()

  add("micromarkExtensions", tag())
  add("fromMarkdownExtensions", tagFromMarkdown())

  function add(field: string, value: unknown) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}