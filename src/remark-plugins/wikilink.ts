import { Root, Parent } from "mdast"
import { Extension as FromMarkdownExtension } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol"
import { Code, Construct, Extension, HtmlExtension, State, Tokenizer } from "micromark-util-types"
import { Plugin } from "unified"

interface Wikilink extends Parent {
  type: "wikilink"
  value: string
  data: { id: string; text: string }
}

declare module "mdast" {
  interface PhrasingContentMap {
    wikilink: Wikilink
  }
  interface RootContentMap {
    wikilink: Wikilink
  }
}

declare module "micromark-util-types" {
  interface TokenTypeMap {
    wikilink: "wikilink"
    wikilinkMarker: "wikilinkMarker"
    wikilinkId: "wikilinkId"
    wikilinkSeparator: "wikilinkSeparator"
    wikilinkText: "wikilinkText"
  }
}

const types = {
  wikilink: "wikilink" as const,
  wikilinkMarker: "wikilinkMarker" as const,
  wikilinkId: "wikilinkId" as const,
  wikilinkSeparator: "wikilinkSeparator" as const,
  wikilinkText: "wikilinkText" as const,
}

/** Syntax extension (text -> tokens) */
export function wikilink(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    return enter

    function enter(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.enter(types.wikilink)
        effects.enter(types.wikilinkMarker)
        effects.consume(code)
        return exitOpeningMarker
      } else {
        return nok(code)
      }
    }

    function exitOpeningMarker(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.wikilinkMarker)
        return enterId
      } else {
        return nok(code)
      }
    }

    function enterId(code: Code): State | undefined {
      if (isFilenameChar(code)) {
        effects.enter(types.wikilinkId)
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function continueId(code: Code): State | undefined {
      if (isSeparatorChar(code)) {
        effects.exit(types.wikilinkId)
        effects.enter(types.wikilinkSeparator)
        effects.consume(code)
        effects.exit(types.wikilinkSeparator)
        return enterText
      } else if (isClosingMarkerChar(code)) {
        effects.exit(types.wikilinkId)
        effects.enter(types.wikilinkMarker)
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
        effects.enter(types.wikilinkText)
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
        effects.exit(types.wikilinkText)
        effects.enter(types.wikilinkMarker)
        effects.consume(code)
        return exitClosingMarker
      } else {
        return nok(code)
      }
    }

    function exitClosingMarker(code: Code): State | undefined {
      if (isClosingMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.wikilinkMarker)
        effects.exit(types.wikilink)
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
  // Initialize state
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      [types.wikilinkId](token) {
        id = this.sliceSerialize(token)
      },
      [types.wikilinkText](token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      [types.wikilink]() {
        this.tag(`<wikilink id="${id}" text="${text || ""}" value="${id}" />`)

        // Reset state
        id = undefined
        text = undefined
      },
    },
  }
}

/** MDAST extension (tokens -> MDAST) */
export function wikilinkFromMarkdown(): FromMarkdownExtension {
  // Initialize state
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      [types.wikilink](token) {
        this.enter(
          {
            type: "wikilink",
            value: "",
            data: { id: "", text: "" },
            children: [],
          },
          token,
        )
      },
      [types.wikilinkId](token) {
        id = this.sliceSerialize(token)
      },
      [types.wikilinkText](token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      [types.wikilink](token) {
        const node = this.stack[this.stack.length - 1]

        if (node.type === "wikilink") {
          node.data.id = id || ""
          node.data.text = text || id || ""
          node.value = id || ""
        }

        this.exit(token)

        // Reset state
        id = undefined
        text = undefined
      },
    },
  }
}

/**
 * Remark plugin
 * Reference: https://github.com/remarkjs/remark-gfm/blob/main/index.js
 */
export function remarkWikilink(): ReturnType<Plugin<[], Root>> {
  // @ts-ignore I'm not sure how to type `this`
  const data = this.data()

  add("micromarkExtensions", wikilink())
  add("fromMarkdownExtensions", wikilinkFromMarkdown())

  function add(field: string, value: unknown) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}
