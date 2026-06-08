import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'

export type WriteLocalFileInput = {
  rootDir: string
  relativePath: string
  bytes: Uint8Array
}

export async function writeLocalFile(input: WriteLocalFileInput): Promise<void> {
  const path = resolveSafePath(input.rootDir, input.relativePath)

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, input.bytes)
}

export async function readLocalFile(
  rootDir: string,
  relativePath: string,
): Promise<Uint8Array> {
  return Uint8Array.from(await readFile(resolveSafePath(rootDir, relativePath)))
}

function resolveSafePath(rootDir: string, relativePath: string): string {
  const normalizedRoot = normalize(rootDir)
  const resolved = normalize(join(normalizedRoot, relativePath))

  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error('Invalid storage path')
  }

  return resolved
}
