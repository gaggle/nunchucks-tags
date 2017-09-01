[![Build Status](https://travis-ci.org/gaggle/nunjucks-tags.svg?branch=enable-travis)](https://travis-ci.org/gaggle/nunjucks-tags)
[![codecov](https://codecov.io/gh/gaggle/nunjucks-tags/branch/master/graph/badge.svg)](https://codecov.io/gh/gaggle/nunjucks-tags)
[![Known Vulnerabilities](https://snyk.io/test/github/gaggle/nunjucks-tags/badge.svg)](https://snyk.io/test/github/gaggle/nunjucks-tags)
[![Code Climate GPA](https://codeclimate.com/github/gaggle/nunjucks-tags/badges/gpa.svg)](https://codeclimate.com/github/gaggle/nunjucks-tags)

# Nunjucks tags
Wrapper around Nunjucks to make it easy to add custom tags like this:

```javascript
const NunjucksTags = require("nunjucks-tags")

const nunjucks = new NunjucksTags()

nunjucks.register("tag", (args) => args.join("/"))

nunjucks.render("{% tag Foo Bar %}")
  .then(res => console.log(res))
> Foo/Bar
```

## Custom tag packs
* [nunjucks-tags-typography]  

## Development
Just run `npm test` and make sure to add tests 
![Graph of coverage/commits]

## Credits
Lifted from the excellent [Hexo] project by [Tommy Chen].

[Hexo]: https://hexo.io
[Tommy Chen]: https://github.com/tommy351
[Graph of coverage/commits]: https://codecov.io/gh/gaggle/nunjucks-tags/branch/master/graphs/commits.svg
[nunjucks-tags-typography]: https://github.com/gaggle/nunjucks-tags-typography
