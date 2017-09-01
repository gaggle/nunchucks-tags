[![Build Status](https://travis-ci.org/gaggle/nunjucks-tags.svg?branch=enable-travis)](https://travis-ci.org/gaggle/nunjucks-tags)
[![codecov](https://codecov.io/gh/gaggle/nunjucks-tags/branch/master/graph/badge.svg)](https://codecov.io/gh/gaggle/nunjucks-tags)
[![Known Vulnerabilities](https://snyk.io/test/github/gaggle/nunjucks-tags/badge.svg)](https://snyk.io/test/github/gaggle/nunjucks-tags)
[![Code Climate GPA](https://codeclimate.com/github/gaggle/nunjucks-tags/badges/gpa.svg)](https://codeclimate.com/github/gaggle/nunjucks-tags)

# Nunjucks Tags
Wrapper around [Nunjucks] to make it easy to add custom tags.

## How to use
Custom tags are functions that takes a Nunjucks block 
and returns a rendered string.

Here we register a custom tag `tag` 
that just joins its arguments as with slash separator: 
```javascript
const NunjucksTags = require("nunjucks-tags")

const nunjucks = new NunjucksTags()

nunjucks.register("tag", (args) => args.join("/"))

nunjucks.render("{% tag Foo Bar %}")
  .then(res => console.log(res))
> Foo/Bar
```

With this you can return rich HTML structures based on simple block-input.


To install:
```bash
$ npm install https://github.com/gaggle/nunjucks-tags --save
```

## Custom tag packs
* [nunjucks-tags-typography]  

## Development
![Graph of coverage/commits]

## Credits
Lifted from the excellent [Hexo] project by [Tommy Chen].

[Graph of coverage/commits]: https://codecov.io/gh/gaggle/nunjucks-tags/branch/master/graphs/commits.svg
[Hexo]: https://hexo.io
[nunjucks-tags-typography]: https://github.com/gaggle/nunjucks-tags-typography
[Nunjucks]: https://github.com/mozilla/nunjucks
[Tommy Chen]: https://github.com/tommy351
