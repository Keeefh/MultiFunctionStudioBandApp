// ============================================
// STEPS 8-9 & 11-12: Sample Cache Module
// ============================================
// PURPOSE: Client-side caching of compressed audio as blob URLs
// RESEARCH TOPICS: URL.createObjectURL, blob:// URLs, memory management

// Global cache: maps filename -> blob URL
const sampleCache = {}

// STEP 8-9: Fetch and cache samples from URLs
// LEARN: fetch for GET, response.blob(), URL.createObjectURL
export async function cacheSamplesFromUrls(samples, backendUrl = 'http://localhost:5000') {
  console.log(`\n📥 Caching ${samples.length} sample(s)...`)

  const cachePromises = samples.map(async (sample) => {
    try {
      const fullUrl = `${backendUrl}${sample.url}`
      console.log(`   Fetching: ${sample.filename}`)

      // STEP 8: Fetch compressed file
      // LEARN: fetch() for GET requests, response.blob()
      const response = await fetch(fullUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Blob object (binary audio data in memory)
      const blob = await response.blob()
      console.log(`   Downloaded: ${sample.filename} (${blob.size} bytes)`)

      // STEP 9: Convert Blob to Object URL
      // LEARN: URL.createObjectURL() creates a blob://... URL (local reference, not HTTP)
      // Example result: 'blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000'
      const blobUrl = URL.createObjectURL(blob)

      // Store in cache by filename
      sampleCache[sample.filename] = blobUrl

      console.log(`   ✓ Cached: ${sample.filename}`)

      return { filename: sample.filename, success: true }
    } catch (err) {
      console.error(`   ✗ Failed to cache ${sample.filename}:`, err)
      return { filename: sample.filename, success: false }
    }
  })

  const results = await Promise.all(cachePromises)
  const success = results.filter(r => r.success).length

  console.log(`✓ Cached ${success}/${samples.length} sample(s)\n`)

  return results
}

// STEP 11: Lookup sample in cache
// LEARN: Object property access, cache hits/misses
export function getCachedSample(filename) {
  const blobUrl = sampleCache[filename]

  if (blobUrl) {
    console.log(`  ✓ Cache HIT: ${filename}`)
    return blobUrl
  } else {
    console.warn(`  ✗ Cache MISS: ${filename} not found`)
    return null
  }
}

// STEP 12: Play sample from cache
// LEARN: Audio API, blob:// URLs, async playback
export function playCachedSample(filename) {
  const blobUrl = getCachedSample(filename)

  if (!blobUrl) {
    console.error(`Cannot play ${filename}: not cached`)
    return
  }

  // STEP 12: Play audio from cached blob URL
  // LEARN: new Audio() creates HTML5 audio element
  const audio = new Audio(blobUrl)

  // LEARN: Audio element plays blob:// URLs just like HTTP URLs
  audio.play()
    .then(() => {
      console.log(`  ✓ Playing ${filename} from cache (instant, no network)`)
    })
    .catch((err) => {
      console.error(`  ✗ Playback error for ${filename}:`, err)
    })

  return audio
}

// Optional: Get all cached samples
export function getAllCachedSamples() {
  return { ...sampleCache }
}

// Optional: Clear cache (cleanup)
export function clearCache() {
  Object.values(sampleCache).forEach(url => {
    URL.revokeObjectURL(url)
  })
  Object.keys(sampleCache).forEach(key => delete sampleCache[key])
  console.log('✓ Cache cleared')
}

export default {
  cacheSamplesFromUrls,
  getCachedSample,
  playCachedSample,
  getAllCachedSamples,
  clearCache,
}
