var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var LRU = require('lru-cache')

var noop = function() {}

var read = function(file, offset, length, cb) {
  var buf = new Buffer(length)
  fs.open(file, 'r', function(err, fd) {
    if (err) return cb(err)
    fs.read(fd, buf, 0, length, offset, function(err, bytes, buf){
      fs.close(fd, function() {
        cb(err, buf)
      })
    })
  })
}

module.exports = function(torrent, opts) {
  var that = {}
  var folder = opts.path || path.join(torrent.infoHash)
  var cache = LRU(200)
  var max = Array(Math.ceil(Math.log(torrent.pieces.length)/Math.log(10))+1).join('0')

  var pad = function(n) {
    n += ''
    if (n.length < max.length) return max.slice(n.length) + n
    return n
  }

  var toName = function(i) {
    var n = pad(i)
    if (n.length > 2) n = path.join(n.slice(0, 2), n.slice(2))
    return path.join(folder, n+'.piece')
  }

  that.read = function(index, range, cb) {
    if (typeof range === 'function') return that.read(index, null, range)
    if (!range) range = {}

    if (index >= torrent.pieces.length) return cb(new Error('Invalid piece'))

    var name = toName(index)
    var offset = range.offset || 0
    var length = range.length

    if (length !== undefined) return read(name, offset, length, cb)

    fs.stat(name, function(err, stat) {
      if (err) return cb(err)
      if (!stat.size) return cb(new Error('Invalid length'))
      read(name, offset, stat.size - offset, cb)
    })
  }

  var mkdir = function(dir, cb) {
    if (cache.get(dir)) return cb()
    mkdirp(dir, function(err) {
      if (err) return cb(err)
      cache.set(dir, true)
      cb()
    })
  }

  that.write = function(index, buf, cb) {
    if (!cb) cb = noop
    var n = toName(index)
    mkdir(path.dirname(n), function(err) {
      if (err) return cb(err)
      fs.writeFile(n, buf, cb)
    })
  }

  that.remove = function(cb) {
    if (!cb) cb = noop
    fs.readdir(folder, function(_, files) {
      if (!files) return cb()

      files = files.filter(function(file) {
        return /^\d+\.piece$/.test(file)
      })

      var loop = function() {
        var file = files.shift()
        if (!file) return cb()
        fs.unlink(path.join(folder, file), loop)
      }

      loop()
    })
  }

  return that
}