var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

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

module.exports = function(folder) {
  if (!folder) folder = '.'
  return function(torrent) {
    folder = path.join(folder, torrent.infoHash)
    mkdirp.sync(folder)

    var that = {}
    var max = Array(Math.ceil(Math.log(torrent.pieces.length)/Math.log(10))+1).join('0')

    var pad = function(n) {
      n += ''
      if (n.length < max) return max.slice(n.length) + n
      return n
    }

    var toName = function(i) {
      return path.join(folder, pad(i))
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
        read(name, offset, stat.size - offset, cb)
      })
    }

    that.write = function(index, buf, cb) {
      fs.writeFile(toName(index), buf, cb || noop)
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
}