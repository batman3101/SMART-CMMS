import jsPDF from 'jspdf'

// Cache for loaded font data
let koreanFontData: string | null = null
let fontLoadPromise: Promise<string | null> | null = null
let fontLoaded = false
let fontLoadAttempted = false

// Local font path (NanumGothic - Google Fonts Korean TTF font)
const KOREAN_FONT_PATH = '/NanumGothic.ttf'

/**
 * Fetches a font and converts it to base64
 * Uses chunked approach to handle large files
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  console.log(`Fetching font from ${url}...`)
  const response = await fetch(url, {
    cache: 'force-cache',
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch font from ${url}: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  console.log(`Font downloaded: ${arrayBuffer.byteLength} bytes`)

  // Convert ArrayBuffer to base64 using chunked approach for better memory handling
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000 // 32KB chunks

  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }

  return btoa(binary)
}

/**
 * Loads the Korean font (cached) - returns null if loading fails
 */
export async function loadKoreanFont(): Promise<string | null> {
  // Return cached font if available
  if (koreanFontData) {
    return koreanFontData
  }

  // If font loading was already attempted and failed, don't retry
  if (fontLoadAttempted && !fontLoaded) {
    return null
  }

  // If font is being loaded, wait for it
  if (fontLoadPromise) {
    return fontLoadPromise
  }

  fontLoadAttempted = true

  // Start loading font from local path
  fontLoadPromise = fetchFontAsBase64(KOREAN_FONT_PATH)
    .then((data) => {
      koreanFontData = data
      fontLoaded = true
      console.log('Korean font (NanumGothic) loaded successfully')
      return data
    })
    .catch((error) => {
      fontLoadPromise = null
      console.warn('Failed to load Korean font, will use default font:', error.message)
      return null
    })

  return fontLoadPromise
}

/**
 * Adds Korean font to a jsPDF document and sets it as the default font
 * If font loading fails, continues with default font
 */
export async function addKoreanFontToDocument(doc: jsPDF): Promise<void> {
  try {
    const fontData = await loadKoreanFont()

    if (!fontData) {
      console.warn('Korean font not available, using default font')
      return
    }

    // Add the font to the document's virtual file system
    doc.addFileToVFS('NanumGothic.ttf', fontData)

    // Register the font
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')

    // Set as default font
    doc.setFont('NanumGothic')

    console.log('Korean font (NanumGothic) applied to PDF document')
  } catch (error) {
    console.warn('Failed to apply Korean font, using default:', error)
    // Continue with default font - Korean text may not display correctly
  }
}

/**
 * Gets the font name to use for autoTable
 */
export function getKoreanFontName(): string {
  return fontLoaded ? 'NanumGothic' : 'helvetica'
}
