// ============================================
// STEPS 1-4: Audio Uploader Component
// ============================================
// PURPOSE: Send audio files to backend for compression
// RESEARCH TOPICS: FormData API, fetch POST requests, File objects

import React, { useState } from 'react'

// STEP 1: Upload samples via FormData
// PURPOSE: Send audio files to backend for compression
// RESEARCH TOPICS: FormData API, fetch POST requests, File object

const uploadSamples = async (fileArray, backendUrl) => {
  const formData = new FormData()

  // Add each file to FormData
  // LEARN: FormData.append(key, value)
  fileArray.forEach(file => {
    formData.append('samples', file) // 'samples' matches backend multer field
  })

  // Send to backend
  // LEARN: fetch API, POST method, multipart/form-data
  const response = await fetch(`${backendUrl}/upload`, {
    method: 'POST',
    body: formData // Browser automatically sets Content-Type
  })

  const result = await response.json()
  return result // Returns { success: true, samples: [{name, filename, url, size}, ...] }
}

export function AudioUploader({ onUploadComplete, backendUrl = 'http://localhost:5000' }) {
  const [fileArray, setFileArray] = useState([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFileArray(selectedFiles)
    setStatus(`${selectedFiles.length} file(s) selected`)
  }

  const handleUpload = async () => {
    if (fileArray.length === 0) {
      setStatus('Select files first')
      return
    }

    setUploading(true)
    setStatus('Uploading...')

    try {
      const result = await uploadSamples(fileArray, backendUrl)

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      setStatus(`✓ Uploaded ${result.samples.length} sample(s)`)
      console.log('Compressed samples:', result.samples)

      // Pass samples to parent component for room join
      if (onUploadComplete) {
        onUploadComplete(result.samples)
      }

      setFileArray([])
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('✗ Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Upload Audio Samples</h3>

      <input
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      <button onClick={handleUpload} disabled={uploading || fileArray.length === 0}>
        {uploading ? 'Uploading...' : 'Upload & Compress'}
      </button>

      <p>{status}</p>
    </div>
  )
}

export default AudioUploader
