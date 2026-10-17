# Ingenium release film

The authored source is ordinary HTML, CSS and JSON. `timeline.json` owns the 90 second scene schedule and the two 20 second sharecut selections; `scenes.js` owns each visual; `style.css` owns typography and layout. `render.mjs` renders actual browser frames, applies a restrained camera push and encodes the deliverables. No external service, stock media, synthetic narration or client UI is used.

The master is 1920 × 1080 at 30 fps. The landscape teaser has the same format; the portrait cut is independently laid out at 1080 × 1920. All are intentionally silent with burned captions. Separate SRT, VTT and timed narration text accompany the master. The captions describe the visuals; they are authored, not a transcription of nonexistent audio.

Open a local preview from the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
# Open http://127.0.0.1:8080/media/preview.html
# Left/right arrow keys move between authored scenes.
```

Rendering requires Node 22+, an explicitly prepared Playwright adapter with an installed browser, the optional Sharp module, and FFmpeg with an H.264 encoder. Point to existing selected tools; this source does not install anything. `SHARP_MODULE` can select an existing absolute Sharp module path if it is not installed beside the project. Keep Chromium's sandbox enabled.

```sh
BROWSER_ADAPTER_DIR=/path/to/existing/adapter \
CHROMIUM_PATH=/path/to/existing/chromium \
VIDEO_WORK_DIR=/path/to/new/video-output \
node media/render.mjs --stills

# Review the actual frames, then render the three MP4 files:
BROWSER_ADAPTER_DIR=/path/to/existing/adapter \
CHROMIUM_PATH=/path/to/existing/chromium \
VIDEO_WORK_DIR=/path/to/video-output \
FFMPEG_PATH=/path/to/ffmpeg \
node media/render.mjs

# Regenerate authored caption sidecars after editing the timeline:
node media/export-captions.mjs
```

If FFmpeg lacks libx264, an existing `X264_PATH=/path/to/x264` CLI can perform the H.264 encoding; FFmpeg still supplies the filters and MP4 muxer. Sharp decodes the PNG stills to private raw RGB intermediates, so a minimal FFmpeg without PNG decoding also works. `--encode-only` reuses reviewed scene stills; `--stills` skips encoding. All tools are separately supplied, retain their own terms and are not bundled in this source archive. Font binaries/notices and original study assets are included through the neighboring `examples/release` and `site/assets/demos` paths in the editable video archive. The original release graphics/code use the MIT license. Fonts retain their complete accompanying notices.

The shipped film was rendered with existing sandbox-enabled Chromium and FFmpeg, using a separately prepared isolated x264 CLI because the installed FFmpeg had no browser-compatible video encoder. Remotion was not installed or found in the inspected caches; the browser + FFmpeg route avoided a new JavaScript dependency tree. Exact tool paths, hashes, commands and checks are private release receipts.

`actual-cli.html` is an editorial rendering of observed command/stdout excerpts, not a client screenshot. The complete observed transcript is in `examples/release/first-success/actual-cli.txt`. It demonstrates a local helper in an isolated installed package. Desktop client discovery remains unverified. Historical V1/V3 studies are labeled revisions, not a controlled before/after experiment. No audience acceptance, accessibility certification or taste score is asserted.
