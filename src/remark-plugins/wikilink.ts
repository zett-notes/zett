declare module "micromark-util-types" {
  interface TokenTypeMap {
    wikilink: "wikilink"
    wikilinkMarker: "wikilinkMarker" 
    wikilinkId: "wikilinkId"
    wikilinkSeparator: "wikilinkSeparator"
    wikilinkText: "wikilinkText"
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
  State,
  Tokenizer,
  TokenType,
} from "micromark-util-types"
import { Plugin } from "unified"
import { Node } from "unist"

// Removed: declare module 'vfile' { interface VFileData extends FileData {} }
// Removed unused interface Options

/** Syntax extension (text -> tokens) */
export function wikilink(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    return enter

    function enter(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.enter("wikilink" as TokenType)
        effects.enter("wikilinkMarker" as TokenType)
        effects.consume(code)
        return exitOpeningMarker
      } else {
        return nok(code)
      }
    }

    function exitOpeningMarker(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        effects.exit("wikilinkMarker" as TokenType)
        return enterId
      } else {
        return nok(code)
      }
    }

    function enterId(code: Code): State | undefined {
      if (isFilenameChar(code)) {
        effects.enter("wikilinkId" as TokenType)
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function continueId(code: Code): State | undefined {
      if (isSeparatorChar(code)) {
        effects.exit("wikilinkId" as TokenType)
        effects.enter("wikilinkSeparator" as TokenType)
        effects.consume(code)
        effects.exit("wikilinkSeparator" as TokenType)
        return enterText
      } else if (isClosingMarkerChar(code)) {
        effects.exit("wikilinkId" as TokenType)
        effects.enter("wikilinkMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker
      } else if (isFilenameChar(code)) {
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function enterText(code: Code): State | undefined {
      if (isTextChar(code)) {
        effects.enter("wikilinkText" as TokenType)
        effects.consume(code)
        return continueText
      } else {
        return nok(code)
      }
    }

    function continueText(code: Code): State | undefined {
      if (isTextChar(code)) {
        effects.consume(code)
        return continueText
      } else if (isClosingMarkerChar(code)) {
        effects.exit("wikilinkText" as TokenType)
        effects.enter("wikilinkMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker
      } else {
        return nok(code)
      }
    }

    function exitClosingMarker(code: Code): State | undefined {
      if (isClosingMarkerChar(code)) {
        effects.consume(code)
        effects.exit("wikilinkMarker" as TokenType)
        effects.exit("wikilink" as TokenType)
        return ok
      } else {
        return nok(code)
      }
    }
  }

  const construct: Construct = {
    name: "wikilink",
    tokenize,
  }

  return {
    text: {
      [codes.leftSquareBracket]: construct,
    },
  }
}

/** Returns true if character is a valid opening marker */
function isOpeningMarkerChar(code: Code): boolean {
  return code === codes.leftSquareBracket
}

/** Returns true if character is a valid closing marker */
function isClosingMarkerChar(code: Code): boolean {
  return code === codes.rightSquareBracket
}

/** Returns true if character is a valid filename character */
function isFilenameChar(code: Code): boolean {
  if (code === null) return false
  return (
    (code >= codes.digit0 && code <= codes.digit9) ||
    (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    code === codes.dash ||
    code === codes.underscore ||
    code === codes.dot ||
    code === codes.tilde ||
    code === codes.exclamationMark ||
    code === codes.dollarSign ||
    code === codes.ampersand ||
    code === codes.apostrophe ||
    code === codes.leftParenthesis ||
    code === codes.rightParenthesis ||
    code === codes.asterisk ||
    code === codes.plusSign ||
    code === codes.comma ||
    code === codes.semicolon ||
    code === codes.atSign ||
    code === codes.leftCurlyBrace ||
    code === codes.rightCurlyBrace ||
    code === codes.space
  )
}

/** Returns true if character is a valid separator character */
function isSeparatorChar(code: Code): boolean {
  return code === codes.verticalBar
}

/** Returns true if character is a valid text character */
function isTextChar(code: Code): boolean {
  return (
    code !== codes.eof &&
    code !== codes.carriageReturn &&
    code !== codes.lineFeed &&
    code !== codes.carriageReturnLineFeed &&
    code !== codes.rightSquareBracket
  )
}

/**
 * HTML extension (tokens -> HTML)
 * This is only used for unit testing
 */
export function wikilinkHtml(): HtmlExtension {
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      wikilink(token: Token) {
        // nothing to do on enter
      },
      wikilinkId(token: Token) {
        id = this.sliceSerialize(token)
      },
      wikilinkText(token: Token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      wikilink() {
        this.tag(`<wikilink id="${id}" text="${text || ""}" />`)
        id = undefined
        text = undefined
      },
    },
  }
}

/** `wikilink` node structure in MDAST. */
interface WikilinkNode extends Node {
  type: "wikilink"
  value: string
  data: {
    id: string
    hName: string
    hProperties: {
      id: string
      text: string
    }
  }
}

// Ensure data is declared with an `id`.
declare module "mdast" {
  interface PhrasingContentMap {
    wikilink: WikilinkNode
  }
}

/** MDAST extension (tokens -> MDAST) */
export function wikilinkFromMarkdown(): FromMarkdownExtension {
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      wikilink(token: Token) {
        const node: WikilinkNode = {
          type: "wikilink",
          value: "",
          data: {
            id: "",
            hName: "wikilink",
            hProperties: { id: "", text: "" },
          }
        }
        // @ts-ignore - we know this is safe because we've defined the WikilinkNode type
        this.enter(node, token)
      },
      wikilinkId(token: Token) {
        id = this.sliceSerialize(token)
      },
      wikilinkText(token: Token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      wikilink(token: Token) {
        const node = this.stack[this.stack.length - 1] as unknown as WikilinkNode
        node.data.id = id || ""
        node.data.hProperties.id = id || ""
        node.data.hProperties.text = text || ""
        node.value = text || id || ""
        this.exit(token)
        id = undefined
        text = undefined
      },
    },
  }
}

/**
 * Remark plugin
 * Safely add micromark and fromMarkdown extensions to this.data().
 */
export function remarkWikilink(): ReturnType<Plugin<[], Root>> {
  // @ts-ignore - we know this will be bound to the processor instance
  const data = this.data()

  add("micromarkExtensions", wikilink())
  add("fromMarkdownExtensions", wikilinkFromMarkdown())

  function add(field: string, value: unknown) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}