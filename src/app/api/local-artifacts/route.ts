import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

type JsonObject = Record<string, unknown>

const CANDIDATE_FILES = [
  'todo.json',
  'todo_plan.json',
  'subagentcard.json',
  'sub_agent_card.json'
]

type LocatedArtifact = { path: string; updated_at: number; data: JsonObject }
type RunEntry = {
  name: string
  path: string
  is_dir: boolean
  updated_at: number
  size: number
}

const safeParse = (text: string): JsonObject | null => {
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as JsonObject
    }
  } catch {
    return null
  }
  return null
}

const latestDirectory = (dirPath: string): string | null => {
  if (!existsSync(dirPath)) return null
  let latest: { path: string; mtime: number } | null = null
  for (const name of readdirSync(dirPath)) {
    const full = join(dirPath, name)
    let mtime = 0
    try {
      const st = statSync(full)
      if (!st.isDirectory()) continue
      mtime = st.mtimeMs
    } catch {
      continue
    }
    if (!latest || mtime >= latest.mtime) {
      latest = { path: full, mtime }
    }
  }
  return latest?.path ?? null
}

const collectRoots = (
  workspace?: string | null,
  runspace?: string | null,
  sessionId?: string | null
) => {
  const roots = new Set<string>()
  const repoRoot = resolve(process.cwd(), '..')
  roots.add(repoRoot)
  roots.add(resolve(repoRoot, 'tests', 'userspace'))
  roots.add(resolve(repoRoot, 'tests', 'userspace', 'sessions'))

  const envWorkspace = process.env.WORKSPACE
  const envRunspace = process.env.RUNSPACE

  if (envWorkspace) roots.add(resolve(envWorkspace))
  if (envRunspace) roots.add(resolve(envRunspace))
  if (workspace) roots.add(resolve(workspace))
  if (runspace) roots.add(resolve(runspace))

  const testSessionSpace = resolve(repoRoot, 'tests', 'userspace', 'sessions')
  if (sessionId) {
    roots.add(resolve(testSessionSpace, sessionId))
  }
  const latestSessionDir = latestDirectory(testSessionSpace)
  if (latestSessionDir) {
    roots.add(latestSessionDir)
    roots.add(join(latestSessionDir, 'runs'))
  }

  return Array.from(roots)
}

const collectLegacyCandidates = (roots: string[]) => {
  const candidates: string[] = []
  for (const root of roots) {
    for (const f of CANDIDATE_FILES) {
      candidates.push(join(root, f))
    }
  }
  return candidates
}

const collectTodoCandidates = (roots: string[]) => {
  const candidates: string[] = []
  for (const root of roots) {
    const todoDir = join(root, 'todo')
    if (!existsSync(todoDir)) continue

    const activatePath = join(todoDir, '.activate')
    if (existsSync(activatePath)) {
      try {
        const activeTitle = readFileSync(activatePath, 'utf-8').trim()
        if (activeTitle) {
          candidates.push(join(todoDir, `${activeTitle}.json`))
        }
      } catch {
      }
    }

    for (const f of readdirSync(todoDir)) {
      if (f.toLowerCase().endsWith('.json')) {
        candidates.push(join(todoDir, f))
      }
    }
  }
  return candidates
}

const collectSubagentCandidates = (roots: string[]) => {
  const candidates: string[] = []
  for (const root of roots) {
    const subagentDir = join(root, 'subagents')
    if (!existsSync(subagentDir)) continue
    for (const f of readdirSync(subagentDir)) {
      if (f.toLowerCase().endsWith('.json')) {
        candidates.push(join(subagentDir, f))
      }
    }
  }
  return candidates
}

const collectRunEntries = (roots: string[]): RunEntry[] => {
  const runDirs = new Set<string>()
  for (const root of roots) {
    const lower = root.toLowerCase()
    if (lower.endsWith('\\runs') || lower.endsWith('/runs')) {
      runDirs.add(root)
      continue
    }
    runDirs.add(join(root, 'runs'))
  }

  const output: RunEntry[] = []
  const seen = new Set<string>()
  for (const runDir of runDirs) {
    if (!existsSync(runDir)) continue
    for (const name of readdirSync(runDir)) {
      const full = join(runDir, name)
      let st: ReturnType<typeof statSync> | null = null
      try {
        st = statSync(full)
      } catch {
        st = null
      }
      if (!st) continue
      const key = full.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      output.push({
        name,
        path: full,
        is_dir: st.isDirectory(),
        updated_at: Math.floor(st.mtimeMs / 1000),
        size: st.isFile() ? st.size : 0
      })
    }
  }

  return output
    .sort((a, b) => b.updated_at - a.updated_at)
    .slice(0, 20)
}

const pickLatest = (paths: string[]): LocatedArtifact | null => {
  let latest: LocatedArtifact | null = null
  for (const path of paths) {
    if (!existsSync(path)) continue
    let parsed: JsonObject | null = null
    try {
      parsed = safeParse(readFileSync(path, 'utf-8'))
    } catch {
      parsed = null
    }
    if (!parsed) continue
    const updatedAt = Math.floor(statSync(path).mtimeMs / 1000)
    if (!latest || updatedAt >= latest.updated_at) {
      latest = { path, updated_at: updatedAt, data: parsed }
    }
  }
  return latest
}

export async function GET(req: NextRequest) {
  const workspace = req.nextUrl.searchParams.get('workspace')
  const runspace = req.nextUrl.searchParams.get('runspace')
  const sessionId = req.nextUrl.searchParams.get('session_id')

  const roots = collectRoots(workspace, runspace, sessionId)
  const legacyCandidates = collectLegacyCandidates(roots)
  const todoCandidates = collectTodoCandidates(roots)
  const subagentCandidates = collectSubagentCandidates(roots)
  const runs = collectRunEntries(roots)

  const latestTodo = pickLatest([...legacyCandidates.filter((p) => p.toLowerCase().includes('todo')), ...todoCandidates])
  const latestSubagent = pickLatest([
    ...legacyCandidates.filter((p) => p.toLowerCase().includes('subagent')),
    ...subagentCandidates
  ])

  return NextResponse.json({
    todo: latestTodo,
    subagentcard: latestSubagent,
    runs
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
