Server for my_drummer_react_app

What it does
- Accepts file uploads via `POST /upload` (form field name: `sample`)
- Saves original to `uploads/original/`
- Compresses to `uploads/compressed/*.webm` using `ffmpeg-static` + `fluent-ffmpeg`
- Serves files at `/uploads/*`

Quick start

1. Change to the `server` folder and install dependencies:

```bash
cd server
npm install
```

2. Start the server:

```bash
npm start
```

3. Example `curl` upload:

```bash
curl -F "sample=@kick.wav" http://localhost:5000/upload
```

Response example:

```json
{ "url": "/uploads/compressed/kick-1600000000000.webm", "filename": "kick.wav" }
```

Frontend usage notes
- From the React app, send a `FormData` with key `sample` to `http://localhost:5000/upload`.
- The server returns a compressed `url` and the original `filename`.
- The client should fetch `http://localhost:5000${url}`, convert to Blob, call `URL.createObjectURL(blob)` and cache the blob URL keyed by `filename`.

Notes
- This uses `ffmpeg-static` so you don't need `ffmpeg` installed globally.
- Adjust the audio codec/bitrate in `server.js` if you want different quality/size tradeoffs.
