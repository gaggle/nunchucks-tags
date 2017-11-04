'use strict'
const isBoolean = require('lodash.isboolean')
const isFunction = require('lodash.isfunction')
const merge = require('lodash.merge')
const nunjucks = require('nunjucks')
const promisify = require('es6-promisify')
const stripIndent = require('strip-indent')

const placeholderSecret = '\uFFFC'
const rPlaceholder = /(?:<|&lt;)!--\uFFFC(\d+)--(?:>|&gt;)/g
const rWhitespaceCounter = /\S/

class Tag {
  constructor () {
    this.env = new nunjucks.Environment(null, {autoescape: false})
    this.placeholders = {}
  }

  /**
   * Register custom tag
   *
   * @param {string} name
   * @param {nunjucksCustomTag|function} fn
   * @param {Object|Boolean} [options]
   * @param {Boolean} [options.async]
   * @param {Boolean} [options.ends]
   */
  register (name, fn, options) {
    if (!name) throw new TypeError('name is required')
    if (!isFunction(fn)) throw new TypeError('fn must be a function')
    if (!options || isBoolean(options)) options = {ends: options}
    options = merge({ends: false, preserveContent: false}, options)

    if (options.preserveContent) {
      if (!options.ends) throw new Error(`Cannot preserve content for ${name}, it has no ends`)
      this.placeholders[name] = new RegExp(`{% ${name}.*%}([\\s\\S]*?){% end${name} %}`, 'gm')
    }

    let tag

    if (options.async) {
      if (fn.length > 2) fn = promisify(fn)

      tag = options.ends
        ? new NunjucksAsyncBlock(name, fn)
        : new NunjucksAsyncTag(name, fn)
    } else {
      tag = options.ends
        ? new NunjucksBlock(name, fn)
        : new NunjucksTag(name, fn)
    }

    this.env.addExtension(name, tag)
  }

  /**
   * Render string by resolving tags within it
   *
   * @param {string} str
   * @param {Object} [context]
   * @returns {Promise}
   */
  render (str, context) {
    context = context || {}

    const cache = []

    const escapeLine = function (s) {
      if (!s) return ''
      return `<!--${placeholderSecret}${(cache.push(s) - 1)}-->`
    }
    const escapeContent = (s, match) => {
      const uuids = match.split('\n').map(l => {
        const split = splitAt(l, countLeadingWhitespace(l))
        return split[0] + escapeLine(split[1])
      })
      return s.replace(match, uuids.join('\n'))
    }
    const applyPlaceholders = function (s, placeholders) {
      for (const name of Object.keys(placeholders)) {
        const placeholder = placeholders[name]
        s = s.replace(placeholder, escapeContent)
      }
      return s
    }
    const unapplyPlaceholders = function (s) {
      return s.replace(rPlaceholder, (str, opts) => cache[opts])
    }

    const env = this.env
    return new Promise((resolve, reject) => {
      const safeStr = applyPlaceholders(str, this.placeholders)
      env.renderString(safeStr, merge(context, {rawString: str}), (err, result) => {
        if (err) return reject(err)
        const resolved = unapplyPlaceholders(result)
        resolve(resolved)
      })
    })
  }
}

class NunjucksTag {
  constructor (name, fn) {
    this.tags = [name]
    this.fn = fn
  }

  parse (parser, nodes, lexer) {
    const node = this._parseArgs(parser, nodes, lexer)

    return new nodes.CallExtension(this, 'run', node, [])
  }

  _parseArgs (parser, nodes, lexer) {
    const tag = parser.nextToken()
    const argArray = new nodes.Array(tag.lineno, tag.colno)
    const node = new nodes.NodeList(tag.lineno, tag.colno)

    let argItem = ''
    let token = parser.nextToken(true)
    while (token) {
      if (token.type === lexer.TOKEN_WHITESPACE || token.type === lexer.TOKEN_BLOCK_END) {
        if (argItem !== '') {
          let argNode = new nodes.Literal(tag.lineno, tag.colno, argItem.trim())
          argArray.addChild(argNode)
          argItem = ''
        }

        if (token.type === lexer.TOKEN_BLOCK_END) break
      } else {
        argItem += token.value
      }
      token = parser.nextToken(true)
    }

    node.addChild(argArray)

    return node
  }

  run (context, args) {
    return this._run(context, args, '')
  }

  _run (context, args, body) {
    return this.fn.call(context.ctx, args, body)
  }
}

class NunjucksBlock extends NunjucksTag {
  parse (parser, nodes, lexer) {
    const node = this._parseArgs(parser, nodes, lexer)
    const body = this._parseBody(parser, nodes, lexer)

    return new nodes.CallExtension(this, 'run', node, [body])
  }

  _parseBody (parser) {
    const body = parser.parseUntilBlocks('end' + this.tags[0])

    parser.advanceAfterBlockEnd()
    return body
  }

  run (context, args, body) {
    return this._run(context, args, trimBody(body))
  }
}

class NunjucksAsyncTag extends NunjucksTag {
  parse (parser, nodes, lexer) {
    const node = this._parseArgs(parser, nodes, lexer)

    return new nodes.CallExtensionAsync(this, 'run', node, [])
  }

  run (context, args, callback) {
    return this._run(context, args, '')
      .then(result => callback(null, result), callback)
  }
}

class NunjucksAsyncBlock extends NunjucksBlock {
  parse (parser, nodes, lexer) {
    const node = this._parseArgs(parser, nodes, lexer)
    const body = this._parseBody(parser, nodes, lexer)

    return new nodes.CallExtensionAsync(this, 'run', node, [body])
  }

  run (context, args, body, callback) {
    const self = this

    body((err, result) => {
      body = () => result

      self._run(context, args, trimBody(body))
        .then(result => callback(err, result))
    })
  }
}

const countLeadingWhitespace = function (s) {
  const count = s.search(rWhitespaceCounter)
  if (count === -1) return s.length
  return count
}

const splitAt = function (str, index) {
  return [str.slice(0, index), str.slice(index)]
}

const trimBody = function (body) {
  return stripIndent(body()).replace(/^\n?|\n?$/g, '')
}

module.exports = Tag

/**
 * @function nunjucksCustomTag
 * @param {string[]} args
 * @param {string} content
 * @param {function} [callback]
 */
