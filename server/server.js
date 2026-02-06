const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const http = require('http')
const socketIo = require('socket.io')

// Note: FFmpeg can be added later for real audio compression
// For now, files are copied as-is to test the multiplayer flow

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

const PORT = process.env.PORT || 5000  // Server port or defaut 
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`
//makes the upload directories
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original')
const COMPRESSED_DIR = path.join(UPLOADS_DIR, 'compressed') 

fs.mkdirSync(ORIGINAL_DIR, { recursive: true }) //makes the directories if they do not exist
fs.mkdirSync(COMPRESSED_DIR, { recursive: true })

app.use(cors())
app.use(express.json())
// Serve uploads from project root /uploads
app.use('/uploads', express.static(UPLOADS_DIR))

// ============================================
// STEP 2: Multer Storage Configuration
// ============================================
// PURPOSE: Configure where and how to save uploaded files
// RESEARCH TOPICS: Multer middleware, diskStorage, Express middleware

const storage = multer.diskStorage({
  // WHERE to save
  // LEARN: diskStorage vs memoryStorage
  destination: (req, file, cb) => {
    cb(null, ORIGINAL_DIR) // cb = callback(error, res)
  },

  // WHAT to name it
  // LEARN: file object properties (originalname, mimetype, size)
  filename: (req, file, cb) => {
    cb(null, file.originalname) // Keep original name
  },
})

const upload = multer({ storage })

// ============================================
// STEP 3: FFmpeg Compression Helper Function
// ============================================
// PURPOSE: Compress large audio files to small Opus/WebM format
// RESEARCH TOPICS: FFmpeg, audio codecs, fluent-ffmpeg

function compressAudio(inputPath, outputFilename) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(COMPRESSED_DIR, outputFilename)

    try {
      // Simple approach: copy the file as-is (instead of FFmpeg compression)
      // This lets us test the multiplayer flow without needing FFmpeg installed
      // TODO: Install ffmpeg and use real compression later
      fs.copyFileSync(inputPath, outputPath)
      console.log(`✓ Copied: ${outputFilename}`)
      resolve(outputPath)
    } catch (err) {
      console.error('✗ Copy error:', err)
      reject(err)
    }
  })
}

app.get('/', (req, res) => res.json({ ok: true }))

// ============================================ 
// STEPS 1-4: Upload & Compress Endpoint
// ============================================
// PURPOSE: Receive files, compress them, return URLs
// RESEARCH TOPICS: Express routes, async/await, middleware array

app.post('/upload', upload.array('samples'), async (req, res) => {
  // upload.array('samples') = Multer middleware
  // LEARN: How middleware modifies req object (req.files)

  try {
    console.log(`Received ${req.files.length} files for upload`)

    const compressedSamples = []

    // Process each uploaded file
    // LEARN: for ... of loops, array iteration
    for (const file of req.files) {
      const originalPath = file.path // Multer added this

      const parsedName = path.parse(file.originalname)
      const baseName = parsedName.name
      //change it into webm(so can be compression format)
      const compressedFilename = `${baseName}.webm` 
      const relativeUrl = `/uploads/compressed/${compressedFilename}`
      const absoluteUrl = `${PUBLIC_BASE_URL}${relativeUrl}`

      // STEP 3: Compress using FFmpeg
      // LEARN: await inside loops (sequential processing)
      await compressAudio(originalPath, compressedFilename)

      // Build the sample object
      // LEARN: fs.statSync for file metadata
      const compressedSample = {
        name: baseName,
        filename: compressedFilename,
        originalFilename: file.originalname,
        url: absoluteUrl,
        relativeUrl,
        size: fs.statSync(path.join(COMPRESSED_DIR, compressedFilename)).size,
      }

      compressedSamples.push(compressedSample)
    }

    // STEP 4: Return JSON response
    // LEARN: Express res.json()//this  iis used for the upload of the files to the backend
    res.json({ success: true, samples: compressedSamples })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// STEPS 5-7: Room Management with Socket.IO
// ============================================
// In-memory rooms storage
// LEARN: Object nesting, room-based state, sample aggregation

const rooms = {}

io.on('connection', (socket) => {
  console.log(`\n🔗 Client connected: ${socket.id}`)

  // STEPS 5-6: User A joins room with samples
  // LEARN: Socket.IO events, room initialization, duplicate prevention
  socket.on('join-room', (data) => {
    const { roomId, activeSamples, userId } = data

    console.log(`\n📍 User ${userId} joining room: ${roomId}`)
    console.log(`   Bringing ${activeSamples.length} sample(s):`)
    activeSamples.forEach(s => console.log(`   - ${s.filename}`))

    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        activeSamples: [],
        clients: [],
      }
      console.log(`   (Room created)`)
    }

    // Check if user already in room (prevent duplicates)
    const userAlreadyInRoom = rooms[roomId].clients.some(c => c.userId === userId);
    
    // Merge samples from joining user, avoid duplicates
    // LEARN: Array.some() for duplicate checking
    for (const sample of activeSamples) {
      const exists = rooms[roomId].activeSamples.some(
        (s) => s.filename === sample.filename
      )
      if (!exists) {
        rooms[roomId].activeSamples.push(sample)
        console.log(`   ✓ Added sample: ${sample.filename}`)
      } else {
        console.log(`   (Skipped duplicate: ${sample.filename})`)
      }
    }

    // Track connected clients
    if (!userAlreadyInRoom) {
      rooms[roomId].clients.push({ userId, socketId: socket.id })
    }
    socket.join(roomId)

    console.log(`   Room ${roomId} now has ${rooms[roomId].activeSamples.length} sample(s)`)
    console.log(`   Room ${roomId} has ${rooms[roomId].clients.length} user(s)`)

    // STEP 7: Broadcast room state to all clients in room
    // LEARN: io.to(roomId).emit() broadcasts to all in room, including sender
    io.to(roomId).emit('room-joined', {
      roomId: roomId,
      samples: rooms[roomId].activeSamples, // Send ALL samples (existing + new)
      clientCount: rooms[roomId].clients.length,
      newUserJoined: userId,
    })

    // Send current users list to all in room (as objects with username property)
    const usersList = rooms[roomId].clients.map(c => ({ username: c.userId }));
    io.to(roomId).emit('room-users', usersList);

    console.log(`   📢 Broadcast room-joined event to room`)
    console.log(`   👥 Users in room: ${usersList.join(', ')}`)
  })

  // STEPS 10-12: Receive pad press from client, broadcast to room
  // LEARN: Socket.IO room broadcasting
  socket.on('pad-pressed', (data) => {
    const { roomId, sampleName, filename, userId } = data

    console.log(`\n🎹 ${userId} pressed pad: ${sampleName}`)

    // Broadcast to all clients in room (including self)
     io.to(roomId).emit('pad-pressed', {
    roomId: roomId,
    sampleName: sampleName,
    filename: filename,
    userId: userId
  });
  })

  // ===== HANDLE SAMPLE UPDATES DURING SESSION =====
  // PURPOSE: When user changes picked samples during session, broadcast to room
  // TRIGGERED BY: frontend socket.emit('room-samples-updated')
  socket.on('room-samples-updated', (data) => {
    const { roomId, samples, userId } = data

    console.log(`\n🔄 ${userId} updated samples in room ${roomId}`)
    console.log(`   Room now has ${samples.length} sample(s)`)

    // Update room's sample list
    if (rooms[roomId]) {
      rooms[roomId].activeSamples = samples;
    }

    // Broadcast to all clients in room
    io.to(roomId).emit('room-samples-updated', {
      roomId: roomId,
      samples: samples,
      userId: userId
    });
  })

  // ===== HANDLE INSTRUMENT PLAYBACK (e.g., guitar) =====
  socket.on('play-instrument', (data = {}) => {
    const { roomId, instrument, userId } = data
    if (!roomId || !instrument) {
      return
    }

    console.log(`\n🎸 ${userId || 'Unknown user'} played instrument: ${instrument}`)

    // Broadcast to everyone else in the room
    socket.to(roomId).emit('play-instrument', data)
  })

  socket.on('voice-offer', ({ roomId, offer, from }) => {
    if (!roomId || !offer) {
      return
    }
    socket.to(roomId).emit('voice-offer', { roomId, offer, from })
  })

  socket.on('voice-answer', ({ roomId, answer, from }) => {
    if (!roomId || !answer) {
      return
    }
    socket.to(roomId).emit('voice-answer', { roomId, answer, from })
  })

  socket.on('voice-ice-candidate', ({ roomId, candidate, from }) => {
    if (!roomId || !candidate) {
      return
    }
    socket.to(roomId).emit('voice-ice-candidate', { roomId, candidate, from })
  })

  socket.on('voice-hangup', ({ roomId, from }) => {
    if (!roomId) {
      return
    }
    socket.to(roomId).emit('voice-hangup', { roomId, from })
  })

  socket.on('disconnect', () => {
    console.log(`\n🔌 Client disconnected: ${socket.id}`)
    
    // Find and remove user from all rooms
    Object.keys(rooms).forEach(roomId => {
      rooms[roomId].clients = rooms[roomId].clients.filter(
        c => c.socketId !== socket.id
      )
      
      // If room is now empty, delete it
      if (rooms[roomId].clients.length === 0) {
        console.log(`   Room ${roomId} is now empty, removing it`)
        delete rooms[roomId]
      } else {
        // Notify remaining users (as objects with username property)
        const usersList = rooms[roomId].clients.map(c => ({ username: c.userId }));
        io.to(roomId).emit('room-users', usersList);
        console.log(`   Room ${roomId} users: ${usersList.map(u => u.username).join(', ')}`)
      }
    })
  })
})

server.listen(PORT, () => {
  console.log(`\n✅ Server listening on http://localhost:${PORT}`)
  console.log(`   - HTTP for file uploads`)
  console.log(`   - WebSocket for Socket.IO real-time sync\n`)
})
