// ============================================
// COMPLETE EXAMPLE: Multiplayer Drummer UI
// ============================================
// PURPOSE: Wire together upload, room join, and pad playback
// DEMONSTRATES: All 12 steps in a single React component

import React, { useState, useEffect } from 'react'
import AudioUploader from '../Audioloader_Component/AudioUploader'
import {
  initSocket,
  joinRoom,
  setupPadPressListener,
  emitPadPress,
  getRoomInfo,
} from '../../utils/socketClient'

const BACKEND_URL = 'http://localhost:5000'

export function MultiplayerDrummer() {
  const [roomId, setRoomId] = useState('room-123')
  const [userId, setUserId] = useState('user-' + Math.random().toString(36).slice(2, 9))
  const [uploadedSamples, setUploadedSamples] = useState([])
  const [roomJoined, setRoomJoined] = useState(false)
  const [status, setStatus] = useState('Disconnected')

  // ============================================
  // Initialize Socket on Mount
  // ============================================
  useEffect(() => {
    const socket = initSocket(BACKEND_URL)

    socket.on('connect', () => {
      setStatus('Connected, waiting to join room')
    })

    socket.on('disconnect', () => {
      setStatus('Disconnected')
      setRoomJoined(false)
    })

    return () => {
      // Cleanup on unmount
    }
  }, [])

  // ============================================
  // STEPS 1-4: Handle Upload Complete
  // ============================================
  const handleUploadComplete = (samples) => {
    // samples = [{name, filename, url, size}, ...]
    setUploadedSamples(samples)
    setStatus(`Uploaded ${samples.length} sample(s), ready to join room`)
  }

  // ============================================
  // STEPS 5-7: Handle Room Join
  // ============================================
  const handleJoinRoom = () => {
    if (uploadedSamples.length === 0) {
      setStatus('Upload samples first')
      return
    }

    // STEP 5-6: Emit join-room event with samples
    joinRoom(roomId, userId, uploadedSamples, BACKEND_URL)

    // STEP 11-12: Setup listener for incoming pad presses
    setupPadPressListener()

    setRoomJoined(true)
    setStatus(`Joined room: ${roomId}`)
  }

  // ============================================
  // STEP 10: Handle Pad Click
  // ============================================
  const handlePadClick = (sampleName) => {
    if (!roomJoined) {
      setStatus('Join a room first')
      return
    }

    // STEP 10: Emit pad press event
    // STEP 12: Local playback via cache
    emitPadPress(sampleName)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🥁 Multiplayer Drummer</h1>

      {/* Status Display */}
      <div style={{ padding: '12px', backgroundColor: '#f0f0f0', marginBottom: '16px' }}>
        <p>
          <strong>User ID:</strong> {userId}
        </p>
        <p>
          <strong>Status:</strong> {status}
        </p>
      </div>

      {/* STEPS 1-4: Upload Component */}
      {!roomJoined && (
        <>
          <AudioUploader onUploadComplete={handleUploadComplete} backendUrl={BACKEND_URL} />

          {uploadedSamples.length > 0 && (
            <>
              <h3>Uploaded Samples</h3>
              <ul>
                {uploadedSamples.map((sample) => (
                  <li key={sample.filename}>
                    {sample.name} ({sample.size} bytes)
                  </li>
                ))}
              </ul>

              {/* Room Join Section */}
              <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #ccc' }}>
                <h3>Join Room</h3>

                <div style={{ marginBottom: '8px' }}>
                  <label>Room ID: </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />
                </div>

                <button onClick={handleJoinRoom} style={{ padding: '8px 16px' }}>
                  Join Room & Sync Samples
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* STEPS 10-12: Pad Controls (visible after room join) */}
      {roomJoined && (
        <>
          <h3>Pads</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            {uploadedSamples.map((sample) => (
              <button
                key={sample.filename}
                onClick={() => handlePadClick(sample.filename)}
                style={{
                  padding: '32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🎵 {sample.name.split('.')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#f44336', color: 'white' }}
          >
            Leave Room
          </button>
        </>
      )}

      {/* Debug Info */}
      <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f9f9f9', fontSize: '12px' }}>
        <p style={{ margin: 0 }}>
          <strong>Room Info:</strong> {JSON.stringify(getRoomInfo(), null, 2)}
        </p>
      </div>
    </div>
  )
}

export default MultiplayerDrummer
