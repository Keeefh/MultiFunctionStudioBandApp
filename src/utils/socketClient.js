// ============================================
// STEPS 5-7 & 10-12: Socket.IO Multiplayer Client
// ============================================
// PURPOSE: Real-time room sync and pad event broadcasting
// RESEARCH TOPICS: Socket.IO client, event emission/listening, room management

import io from 'socket.io-client'
import { cacheSamplesFromUrls, playCachedSample } from '../utils/sampleCache'

// LEARN: Socket.IO client instance (created once)
let socket = null
let currentRoomId = null
let currentUserId = null

// ============================================
// STEP 5: Initialize Socket Connection
// ============================================
export function initSocket(backendUrl = 'http://localhost:5000') {
  if (socket && socket.connected) {
    console.log('Socket already connected')
    return socket
  }

  // LEARN: io() connects to backend via WebSocket
  socket = io(backendUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log(`\n🔗 Connected to server: ${socket.id}`)
  })

  socket.on('disconnect', () => {
    console.log(`\n🔌 Disconnected from server`)
  })

  return socket
}

// ============================================
// STEPS 5-6: Join Room with Samples
// ============================================
// PURPOSE: Send upload to backend for storage
// RESEARCH TOPICS: Socket.IO emit, room data structure
export function joinRoom(roomId, userId, uploadedSamples, backendUrl = 'http://localhost:5000') {
  if (!socket || !socket.connected) {
    console.error('Socket not connected, call initSocket first')
    return
  }

  currentRoomId = roomId
  currentUserId = userId

  console.log(`\n📍 Joining room: ${roomId} as ${userId}`)

  // STEP 5-6: Emit join-room event to backend
  // LEARN: socket.emit(eventName, data)
  socket.emit('join-room', {
    roomId: roomId,
    activeSamples: uploadedSamples, // From upload response: [{name, filename, url, size}]
    userId: userId,
  })

  // STEP 7: Listen for room-joined event (backend broadcast)
  // LEARN: socket.on(eventName, callback)
  socket.on('room-joined', async (data) => {
    const { activeSamples, clientCount, newUserJoined } = data

    console.log(`\n✓ Room joined!`)
    console.log(`   Clients in room: ${clientCount}`)
    console.log(`   Available samples: ${activeSamples.length}`)

    // STEPS 8-9: Fetch and cache samples
    // LEARN: Promise-based async caching
    await cacheSamplesFromUrls(activeSamples, backendUrl)
  })
}

// ============================================
// STEP 10: Emit Pad Press Event
// ============================================
// PURPOSE: Send pad click to other users
// RESEARCH TOPICS: Socket.IO emit, event broadcasting
export function emitPadPress(sampleName) {
  if (!socket || !currentRoomId) {
    console.error('Not connected to room')
    return
  }

  console.log(`\n🎹 Pressed pad: ${sampleName}`)

  // STEP 10: Emit to server
  // LEARN: socket.emit() sends event to server
  socket.emit('pad-pressed', {
    roomId: currentRoomId,
    sampleName: sampleName, // e.g., 'kick.wav' (not the full URL!)
    userId: currentUserId,
    timestamp: Date.now(),
  })

  // Play locally
  playCachedSample(sampleName)
}

// ============================================
// STEP 11-12: Listen for Pad Press Events
// ============================================
// PURPOSE: Receive pad clicks from other users and play
// RESEARCH TOPICS: Socket.IO event listeners, cache lookups
export function setupPadPressListener() {
  if (!socket) {
    console.error('Socket not initialized')
    return
  }

  // LEARN: socket.on() listens for events from server
  socket.on('pad-pressed', (data) => {
    const { sampleName, userId } = data

    console.log(`\n🎵 ${userId} played: ${sampleName}`)

    // STEP 11: Check cache for sample
    // STEP 12: Play from cache instantly
    playCachedSample(sampleName)
  })
}

// ============================================
// Optional: Room Info & Cleanup
// ============================================

export function getRoomInfo() {
  return {
    roomId: currentRoomId,
    userId: currentUserId,
    connected: socket && socket.connected,
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    console.log('Socket disconnected')
  }
}

export function getSocket() {
  return socket
}

export default {
  initSocket,
  joinRoom,
  emitPadPress,
  setupPadPressListener,
  getRoomInfo,
  disconnectSocket,
  getSocket,
}
