/* global describe, it, beforeEach */
'use strict'
const assert = require('assert')

const Nunjucks = require('..')

describe('nunjucks-tags', function () {
  let tag

  beforeEach(function () {
    tag = new Nunjucks()
  })

  describe('#register', function () {
    it('requires name', function () {
      assert.throws(() => tag.register(undefined, () => {
      }), TypeError)
    })

    it('requires function', function () {
      assert.throws(() => tag.register('tag', 'notafunc'), TypeError)
    })

    it('allows boolean to specify ends', function () {
      const args = ['tag', (args) => args.join('')]

      tag.register(...args, true) // Passing in True should specify this is a block

      return tag.render('{% tag Foo %}Bar{% endtag %}')
        .then(result => assert.equal(result, 'Foo'))
    })

    it('throws on preserve content without ends', function () {
      assert.throws(() => {
        tag.register('tag', () => '', {ends: false, preserveContent: true})
      }, Error)
    })
  })

  describe('#render', function () {
    it('interpolates {{ }} using context', function () {
      return tag.render('{{ user }}', {user: 'Foo'})
        .then(result => assert.equal(result, 'Foo'))
    })

    it('can preserve content', function () {
      tag.register('code', (args, content) => `${args.join('')} ${content}`, {
        ends: true,
        preserveContent: true
      })

      const str = '{% code foo:bar %}{{ user }}{% endcode %}'
      return tag.render(str, {user: 'Foo'})
        .then(result => assert.equal(result, 'foo:bar {{ user }}'))
    })

    })
  })

  describe('custom tag', function () {
    describe('tag', function () {
      const opts = (o) => Object.assign({}, o)

      it('resolves', function () {
        tag.register('tag', (args) => args.join(''))

        return tag.render('{% tag Foo %}')
          .then(result => assert.equal(result, 'Foo'))
      })

      it('resolves w. async', function () {
        tag.register('tag',
          (args) => Promise.resolve(args.join('')),
          opts({async: true})
        )

        return tag.render('{% tag Foo %}')
          .then(result => assert.equal(result, 'Foo'))
      })

      it('resolves w. async callback', function () {
        tag.register('tag',
          (args, content, cb) => cb(null, args.join('')),
          opts({async: true})
        )

        return tag.render('{% tag Foo %}')
          .then(result => assert.equal(result, 'Foo'))
      })
    })

    describe('block', function () {
      const opts = (o) => Object.assign({ends: true}, o)

      it('resolves', function () {
        tag.register('tag', (args, content) => `${args.join('')} ${content}`, opts())

        return tag.render('{% tag Foo %}Bar{% endtag %}')
          .then(result => assert.equal(result, 'Foo Bar'))
      })

      it('resolves w. async', function () {
        tag.register('tag',
          (args, content) => Promise.resolve(`${args.join('')} ${content}`),
          opts({async: true})
        )

        return tag.render('{% tag Foo %}Bar{% endtag %}')
          .then(result => assert.equal(result, 'Foo Bar'))
      })

      it('resolves foo', function () {
        tag.register('tag', () => Promise.resolve(), opts({async: true}))

        return tag.render('{% tag %}{% endtag %}')
          .then(result => assert.equal(result, ''))
      })

      it('resolves w. async callback', function () {
        tag.register('tag',
          (args, content, cb) => cb(null, `${args.join('')} ${content}`),
          opts({async: true})
        )

        return tag.render('{% tag Foo %}Bar{% endtag %}')
          .then(result => assert.equal(result, 'Foo Bar'))
      })
    })

    it('can reject', function (done) {
      tag.register('tag', () => {
        throw new Error('Stop!')
      })

      tag.render('{% tag Foo %}')
        .catch(err => {
          if (err) done()
        })
    })
  })
})
