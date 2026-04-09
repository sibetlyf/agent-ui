import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const encoder = new TextEncoder()
  const testPath = join(process.cwd(), '..', 'test.json')
  let raw: Buffer
  try {
    raw = readFileSync(testPath)
  } catch {
    return NextResponse.json({ error: 'test.json not found' }, { status: 404 })
  }

  const text = raw.toString('utf16le')
  const lines = text.split('\n')

  const stream = new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload) continue
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        await new Promise(r => setTimeout(r, 8))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST() {
  return GET()
}
