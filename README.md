streaming-webclient
===================

webclient portion of [https://github.com/juanvallejo/streaming-server](https://github.com/juanvallejo/streaming-server)

![Working demo at FlickTrack.me](https://i.imgur.com/YhJ1sUP.jpg)

<a name="building"></a>
## Building

To make changes, simply edit the file you wish to change, save, and run `make`.
Alternatively, use [browserify](http://browserify.org/) on the `main.js` file:

```bash
./node_modules/browserify/bin/cmd.js ./src/client/main.js --outfile ./src/static/FlickTrack.js
```

By default, the [streaming-server]() will look for the "compiled" file under `src/static/FlickTrack.js`.

## Important files

Noticeable files that control the overall appearance of the homepage and the "video" page are found under `./src/static/index.html` and `./src/static/video.html` respectively.

**Note** that if you make changes to any javascript files under `./src/client/...`, you will need to run `make` or follow the instructions under [Building](#building)

## Submodule

This repository is included as a submodule in the [streaming-server](https://github.com/juanvallejo/streaming-server).

Ensure that the latest changes are present in the submodule directory ([pkg/webclient](https://github.com/juanvallejo/streaming-server/tree/master/pkg)), and run `git submodule update` to ensure that the latest client is being served by the streaming server.
