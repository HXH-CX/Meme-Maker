export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画布导出失败'))
    }, 'image/png')
  })
}

export async function downloadCanvas(canvas: HTMLCanvasElement, filename = 'meme.png') {
  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
}

export async function copyCanvas(canvas: HTMLCanvasElement) {
  // blob 以 Promise 传入，保证 write 在点击的用户激活窗口内同步发起
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasToBlob(canvas) })])
}