# torrent-individual-piece-storage

[torrent-stream](https://github.com/mafintosh/torrent-stream) storage that stores each piece in individual files

```
npm install torrent-individual-piece-storage
```

## Usage

``` js
var torrents = require('torrent-stream')
var engine = torrents('magnet:some-magnet-link', {
  storage: require('torrent-individual-piece-storage')('/tmp')
})
```

## License

MIT
