// Shrinks a photo on the device before it is sent to the scanner (smaller upload, faster on mobile data).
// The photo is never stored by the app; only the recognized text is kept (docs/14 §12).

export const MAX_SIDE = 1600
const QUALITY = 0.85

export interface PhotoPayload {
  data: string // base64 without the "data:" prefix
  mime_type: 'image/jpeg'
}

/** Target size that keeps the aspect ratio and fits in MAX_SIDE × MAX_SIDE. */
export function fitSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function loadImage(file: File): Promise<{ img: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { img: bmp, width: bmp.width, height: bmp.height }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { img, width: img.naturalWidth, height: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function photoToPayload(file: File): Promise<PhotoPayload> {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar (foto soal).')
  const { img, width, height } = await loadImage(file)
  const size = fitSize(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Perangkat ini belum bisa memproses foto.')
  ctx.fillStyle = '#fff' // transparent PNG → white background
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.drawImage(img, 0, 0, size.width, size.height)
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mime_type: 'image/jpeg' }
}
