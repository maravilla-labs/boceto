import { describe, expect, it, beforeEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeMcpServer, readMcpServer, type McpServerEntry } from '../src/integrations/mcp/config'

const ENTRY: McpServerEntry = { command: 'npx', args: ['-y', '@boceto/mcp'] }

function tmpFile(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'boceto-mcp-merge-')), name)
}

describe('writeMcpServer', () => {
  it('creates the file (with parent dir) when the path does not exist', async () => {
    const path = tmpFile('nested/dir/.claude.json')
    const r = await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    expect(r.outcome).toBe('created')
    expect(existsSync(path)).toBe(true)
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    expect(doc.mcpServers.boceto).toEqual(ENTRY)
  })

  it('initialises mcpServers on an existing file with no mcpServers key', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ otherSetting: 'preserved', apiKey: 'sk-test' }, null, 2))
    const r = await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    expect(r.outcome).toBe('updated')
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    expect(doc.otherSetting).toBe('preserved')
    expect(doc.apiKey).toBe('sk-test')
    expect(doc.mcpServers.boceto).toEqual(ENTRY)
  })

  it('preserves all sibling mcpServers entries when adding a new one', async () => {
    const path = tmpFile('config.json')
    writeFileSync(
      path,
      JSON.stringify(
        { mcpServers: { existing: { command: 'node', args: ['/x.js'] } } },
        null,
        2,
      ),
    )
    await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    expect(doc.mcpServers.existing).toEqual({ command: 'node', args: ['/x.js'] })
    expect(doc.mcpServers.boceto).toEqual(ENTRY)
  })

  it('is a no-op when the new entry deep-equals the existing one', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ mcpServers: { boceto: ENTRY } }, null, 2))
    const before = readFileSync(path, 'utf8')
    const r = await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    expect(r.outcome).toBe('skipped')
    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  it('overwrites when mode=force and the entry differs', async () => {
    const path = tmpFile('config.json')
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { boceto: { command: 'old', args: [] } } }, null, 2),
    )
    const r = await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'force' })
    expect(r.outcome).toBe('updated')
    expect(r.replaced).toEqual({ command: 'old', args: [] })
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    expect(doc.mcpServers.boceto).toEqual(ENTRY)
  })

  it('leaves the existing entry alone when mode=skip', async () => {
    const path = tmpFile('config.json')
    const existing = { command: 'old', args: [] }
    writeFileSync(path, JSON.stringify({ mcpServers: { boceto: existing } }, null, 2))
    const r = await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'skip' })
    expect(r.outcome).toBe('skipped')
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    expect(doc.mcpServers.boceto).toEqual(existing)
  })

  it('asks confirmReplace in prompt mode and honours `false`', async () => {
    const path = tmpFile('config.json')
    const existing = { command: 'old', args: [] }
    writeFileSync(path, JSON.stringify({ mcpServers: { boceto: existing } }, null, 2))
    const r = await writeMcpServer({
      configPath: path,
      name: 'boceto',
      entry: ENTRY,
      mode: 'prompt',
      confirmReplace: async () => false,
    })
    expect(r.outcome).toBe('skipped')
    expect(JSON.parse(readFileSync(path, 'utf8')).mcpServers.boceto).toEqual(existing)
  })

  it('asks confirmReplace in prompt mode and honours `true`', async () => {
    const path = tmpFile('config.json')
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { boceto: { command: 'old', args: [] } } }, null, 2),
    )
    const r = await writeMcpServer({
      configPath: path,
      name: 'boceto',
      entry: ENTRY,
      mode: 'prompt',
      confirmReplace: async () => true,
    })
    expect(r.outcome).toBe('updated')
    expect(JSON.parse(readFileSync(path, 'utf8')).mcpServers.boceto).toEqual(ENTRY)
  })

  it('refuses to overwrite a file with invalid JSON', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, '{ this is not valid json')
    const before = readFileSync(path, 'utf8')
    await expect(
      writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'force' }),
    ).rejects.toThrow(/not valid JSON/i)
    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  it('refuses when the top-level value is an array', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, '[]')
    await expect(
      writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'force' }),
    ).rejects.toThrow(/must contain a JSON object/i)
  })

  it('refuses when mcpServers is present but not an object', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ mcpServers: ['oops'] }))
    await expect(
      writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'force' }),
    ).rejects.toThrow(/non-object/i)
  })

  it('writes atomically — no .boceto.tmp left after success', async () => {
    const path = tmpFile('config.json')
    await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    expect(existsSync(`${path}.boceto.tmp`)).toBe(false)
  })

  it('preserves 4-space indentation when input is 4-space indented', async () => {
    const path = tmpFile('config.json')
    const input = JSON.stringify({ otherSetting: 'x' }, null, 4)
    writeFileSync(path, input + '\n')
    await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    const after = readFileSync(path, 'utf8')
    // Look for 4-space indentation at start of `"otherSetting"`.
    expect(after).toMatch(/\n {4}"otherSetting"/)
    expect(after).toMatch(/\n {4}"mcpServers"/)
  })

  it('preserves tab indentation when input is tab-indented', async () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ otherSetting: 'x' }, null, '\t') + '\n')
    await writeMcpServer({ configPath: path, name: 'boceto', entry: ENTRY, mode: 'prompt' })
    const after = readFileSync(path, 'utf8')
    expect(after).toMatch(/\n\t"otherSetting"/)
  })

  it('handles a server name other than `boceto`', async () => {
    const path = tmpFile('config.json')
    const r = await writeMcpServer({ configPath: path, name: 'boceto-dev', entry: ENTRY, mode: 'prompt' })
    expect(r.outcome).toBe('created')
    expect(JSON.parse(readFileSync(path, 'utf8')).mcpServers['boceto-dev']).toEqual(ENTRY)
  })
})

describe('readMcpServer', () => {
  it('returns null on a missing file', () => {
    expect(readMcpServer('/tmp/does-not-exist-boceto-test.json', 'boceto')).toBeNull()
  })

  it('returns null on a present file without mcpServers', () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ other: 'x' }))
    expect(readMcpServer(path, 'boceto')).toBeNull()
  })

  it('returns the entry when present', () => {
    const path = tmpFile('config.json')
    writeFileSync(path, JSON.stringify({ mcpServers: { boceto: ENTRY } }))
    expect(readMcpServer(path, 'boceto')).toEqual(ENTRY)
  })

  it('returns null on malformed JSON (rather than throwing)', () => {
    const path = tmpFile('config.json')
    writeFileSync(path, '{ no')
    expect(readMcpServer(path, 'boceto')).toBeNull()
  })
})

// Make beforeEach a no-op — keeps the describe blocks clean if we add it later.
beforeEach(() => {})
