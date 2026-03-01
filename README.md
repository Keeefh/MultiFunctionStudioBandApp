

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

### From Peer-to-Peer → SFU Architecture (Discord-style)
Currently the app uses **P2P (Peer-to-Peer)** — two browsers connect directly to each other. This works for 2 users but breaks down with more.

The goal is to move to an **SFU (Selective Forwarding Unit)** architecture — the same model Discord, Zoom, and Google Meet use. Instead of browsers connecting to each other directly, everyone connects to a central media server that routes audio/events to the right people.

```
Current (P2P):              Future (SFU):
User A ←→ User B           User A ─┐
                            User B ─┤─ Media Server ─→ everyone
                            User C ─┘
```

This unlocks:
- Full band sessions with 5+ users simultaneously
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

<img width="1919" height="926" alt="image" src="https://github.com/user-attachments/assets/31e877f7-a63b-46d5-9e10-ee80397db397" />

### Guitar
| Key | Action |
|-----|--------|
| Q W E R T | Select chord (top row) |
| A S D F G | Select chord (bottom row) |
| ↓ Arrow | Strum down |
| ↑ Arrow | Strum up |

> Strum keys and chord keybinds are fully rebindable inside the Guitar panel.

<img width="1916" height="954" alt="image" src="https://github.com/user-attachments/assets/0a694b0b-b811-43f8-9575-41564767f685" />

---
### Instrument & Multiplayer HUB
<img width="1917" height="969" alt="image" src="https://github.com/user-attachments/assets/b12f7d73-d77a-4df0-acfe-f631aa70e1ef" />



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
