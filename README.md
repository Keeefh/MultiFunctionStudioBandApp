# Multi-Function Studio Band App

> **Play music together online, in real-time — like a virtual studio session.**

Most music collaboration tools require expensive software, DAWs, or being in the same room. This app solves that by letting anyone open a browser, join a room, and jam with another person instantly — no downloads, no setup.

---

## The Problem

Online music collaboration is broken:
- Video calls have too much audio delay for live playing
- DAWs like Ableton require expensive licenses and technical knowledge
- There's no casual, browser-based way to just *play* with someone online

This app fixes that with real-time instrument sync — when you press a pad or strum a chord, your bandmate hears it in under 50ms.

---

## Current Features

### Instruments
- **Drum Pads** — 9-pad drum machine, playable via mouse or keyboard shortcuts
- **Virtual Guitar** — Chord-based guitar with customizable chord boards and strum controls, powered by WebAudioFont synthesis

### Multiplayer
- Create or join a room with a shared Room ID
- Real-time instrument sync via WebSocket — both users hear each other play live
- Shared sample library — upload custom audio samples and share them across the room
- Per-user volume controls
- Voice chat via WebRTC

### Other
- Upload custom audio samples and assign them to pads
- Live audio spectrum visualizer while playing
- Keyboard-driven controls for both instruments

---

## Roadmap

### More Instruments
- Piano / MIDI keyboard
- Bass guitar
- Beat sequencer / drum machine with step patterns
- Make instruments more learnable with note modes, chord suggestions, and visual guides

### From Peer-to-Peer → Discord-style Rooms
Currently the app is peer-to-peer (2 users). The goal is to evolve into a Discord-style experience:
- Persistent rooms with multiple users (full band sessions)
- Separate instrument channels (guitarist, drummer, bassist)
- Room history and session recording
- Friend system and invite links
- Text chat alongside live playing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Framer Motion |
| Audio | Web Audio API, WebAudioFont |
| Real-time | Socket.IO (WebSocket) |
| Backend | Node.js, Express |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Running Locally

```bash
# Install dependencies
npm install

# Run frontend + backend together
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## Keyboard Controls

### Drum Pads
| T | Y | U |
|---|---|---|
| G | H | J |
| V | B | N |

### Guitar
| Key | Action |
|-----|--------|
| Q W E R T | Select chord (top row) |
| A S D F G | Select chord (bottom row) |
| ↓ Arrow | Strum down |
| ↑ Arrow | Strum up |

> Strum keys and chord keybinds are fully rebindable inside the Guitar panel.

---

## Architecture

```
Browser (Vercel)
    │
    ├── React app loads from Vercel
    │
    └── WebSocket connection to Railway backend
            │
            ├── Join room
            ├── Share audio samples (cached as Blob URLs)
            ├── Send pad / guitar events
            └── Receive other users' events in real-time
```

---

## Project Structure

```
├── server/
│   └── server.js              # Express + Socket.IO backend
├── src/
│   ├── App.jsx                # Root component, audio logic, keyboard handler
│   ├── Components/
│   │   ├── ControlHub/        # Top navigation, instrument switcher
│   │   ├── GuitarEngine/      # Virtual guitar + chord boards
│   │   ├── PadsSection/       # Drum pad grid
│   │   ├── MultiplayerPanel/  # Room join UI
│   │   └── libraryBrowser/    # Sample library browser
│   └── utils/
│       ├── socketClient.js    # Socket.IO client logic
│       └── sampleCache.js     # Client-side audio blob caching
└── public/
    ├── guitarMenuIcon.png
    ├── PadSampleIcon.png
    └── Frame 1.svg            # Guitar visual
```
