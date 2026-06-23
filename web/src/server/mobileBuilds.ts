import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

export type MobileBuildArtifactType = 'apk' | 'aab'
export type MobileBuildStatus = 'running' | 'completed' | 'failed'

export type MobileBuildJob = {
  id: string
  type: MobileBuildArtifactType
  status: MobileBuildStatus
  createdAt: string
  completedAt?: string
  artifactName?: string
  artifactBytes?: number
  exitCode?: number
  pid?: number
}

const BUILD_OUTPUT_DIR = process.env.FORJA_MOBILE_BUILD_OUTPUT_DIR ?? '/data/mobile-builds'
const BUILD_REPO_DIR = process.env.FORJA_MOBILE_BUILD_REPO_DIR ?? '/repo'
const BUILD_SCRIPT = process.env.FORJA_MOBILE_BUILD_SCRIPT ?? join(BUILD_REPO_DIR, 'build-apk.sh')
const BUILD_API_URL = process.env.FORJA_MOBILE_BUILD_API_URL ?? process.env.FORJA_PUBLIC_URL

export async function listMobileBuildJobs(): Promise<MobileBuildJob[]> {
  await mkdir(BUILD_OUTPUT_DIR, { recursive: true })
  const entries = await readdir(BUILD_OUTPUT_DIR, { withFileTypes: true })
  const jobs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => isSafeJobId(entry.name))
      .map(async (entry) => reconcileJob(await readJob(entry.name))),
  )

  return jobs
    .filter((job): job is MobileBuildJob => job !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function startMobileBuildJob(type: MobileBuildArtifactType): Promise<MobileBuildJob> {
  const running = (await listMobileBuildJobs()).find((job) => job.status === 'running')
  if (running) {
    throw new Error('Já existe uma build em andamento.')
  }

  const id = new Date().toISOString().replace(/[-:.TZ]/g, '')
  const jobDir = getJobDir(id)
  await mkdir(jobDir, { recursive: true })

  const job: MobileBuildJob = {
    id,
    type,
    status: 'running',
    createdAt: new Date().toISOString(),
  }
  await writeJob(job)

  const logStream = createWriteStream(getLogPath(id), { flags: 'a' })
  const child = spawn('bash', [BUILD_SCRIPT, type, jobDir], {
    cwd: BUILD_REPO_DIR,
    detached: false,
    env: {
      ...process.env,
      EXPO_PUBLIC_FORJA_API_URL: BUILD_API_URL ?? 'https://forja.phperalta.me',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const runningJob: MobileBuildJob = child.pid ? { ...job, pid: child.pid } : job
  await writeJob(runningJob)

  child.stdout.pipe(logStream)
  child.stderr.pipe(logStream)
  child.on('exit', (exitCode) => {
    void finalizeJob(id, type, exitCode ?? 1)
  })
  child.on('error', () => {
    void finalizeJob(id, type, 1)
  })

  return runningJob
}

async function reconcileJob(job: MobileBuildJob | null): Promise<MobileBuildJob | null> {
  if (!job || job.status !== 'running' || isProcessRunning(job.pid)) {
    return job
  }

  const artifact = await findArtifact(job.id, job.type)
  const nextJob: MobileBuildJob = {
    ...job,
    status: artifact ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
    exitCode: artifact ? 0 : 1,
  }

  if (artifact) {
    nextJob.artifactName = artifact.name
    nextJob.artifactBytes = artifact.bytes
  }

  await writeJob(nextJob)
  return nextJob
}

export async function readMobileBuildLog(id: string): Promise<string> {
  assertSafeJobId(id)

  try {
    return await readFile(getLogPath(id), 'utf8')
  } catch {
    return ''
  }
}

export async function resolveMobileBuildArtifact(
  id: string,
  artifactName: string,
): Promise<{ path: string; name: string; bytes: number }> {
  assertSafeJobId(id)
  assertSafeArtifactName(artifactName)

  const path = resolve(getJobDir(id), artifactName)
  const root = `${resolve(getJobDir(id))}/`
  if (!path.startsWith(root)) {
    throw new Error('Invalid artifact path')
  }

  const fileStat = await stat(path)
  if (!fileStat.isFile()) {
    throw new Error('Artifact not found')
  }

  return { path, name: artifactName, bytes: fileStat.size }
}

async function finalizeJob(
  id: string,
  type: MobileBuildArtifactType,
  exitCode: number,
): Promise<void> {
  const current = await readJob(id)
  if (!current) {
    return
  }

  const artifact = exitCode === 0 ? await findArtifact(id, type) : null
  const nextJob: MobileBuildJob = {
    ...current,
    status: exitCode === 0 && artifact ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
    exitCode,
  }

  if (artifact) {
    nextJob.artifactName = artifact.name
    nextJob.artifactBytes = artifact.bytes
  }

  await writeJob(nextJob)
}

async function findArtifact(
  id: string,
  type: MobileBuildArtifactType,
): Promise<{ name: string; bytes: number } | null> {
  const files = await readdir(getJobDir(id), { withFileTypes: true })
  const artifact = files.find((entry) => entry.isFile() && extname(entry.name) === `.${type}`)
  if (!artifact) {
    return null
  }

  const fileStat = await stat(join(getJobDir(id), artifact.name))
  return { name: artifact.name, bytes: fileStat.size }
}

async function readJob(id: string): Promise<MobileBuildJob | null> {
  assertSafeJobId(id)

  try {
    return JSON.parse(await readFile(getJobPath(id), 'utf8')) as MobileBuildJob
  } catch {
    return null
  }
}

async function writeJob(job: MobileBuildJob): Promise<void> {
  await writeFile(getJobPath(job.id), `${JSON.stringify(job, null, 2)}\n`)
}

function getJobDir(id: string): string {
  return join(BUILD_OUTPUT_DIR, id)
}

function getJobPath(id: string): string {
  return join(getJobDir(id), 'job.json')
}

function getLogPath(id: string): string {
  return join(getJobDir(id), 'build.log')
}

function assertSafeJobId(id: string): void {
  if (!isSafeJobId(id)) {
    throw new Error('Invalid build id')
  }
}

function isSafeJobId(id: string): boolean {
  return /^\d{14,20}$/.test(id)
}

function isProcessRunning(pid: number | undefined): boolean {
  if (!pid) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function assertSafeArtifactName(name: string): void {
  if (basename(name) !== name || !/^forja-v[\w.-]+\.(apk|aab)$/.test(name)) {
    throw new Error('Invalid artifact name')
  }
}
