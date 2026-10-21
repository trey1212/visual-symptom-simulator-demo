// Procedural test image for the shader sandbox, so filters can be tried
// without any image files. Has a grid (distortions), text (blur/contrast),
// saturated swatches (color blindness) and bright dots (halos/starbursts).
export function createTestPattern(width = 1600, height = 1000): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(0, 0, width, height)

  // Amsler-style grid
  const cell = 40
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= width; x += cell) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
  }
  for (let y = 0; y <= height; y += cell) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
  }
  ctx.stroke()

  // Fixation point
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 8, 0, Math.PI * 2)
  ctx.fill()

  const swatches = ['#d62828', '#2a9d3f', '#1d4ed8', '#f2c500', '#e76f51', '#7b2cbf']
  swatches.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(80 + i * 120, 80, 100, 100)
  })

  ctx.fillStyle = '#111'
  ctx.font = '600 56px system-ui, sans-serif'
  ctx.fillText('The quick brown fox', 80, height - 170)
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText('jumps over the lazy dog. 0123456789', 80, height - 110)

  // Bright lights on a dark panel
  ctx.fillStyle = '#111'
  ctx.fillRect(width - 520, 80, 440, 260)
  ctx.fillStyle = '#fff'
  for (const [x, y, r] of [[-430, 160, 10], [-300, 250, 14], [-170, 150, 8]]) {
    ctx.beginPath()
    ctx.arc(width + x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas
}
