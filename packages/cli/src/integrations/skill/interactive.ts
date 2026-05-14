import * as p from '@clack/prompts'
import { SKILL_TARGETS, type SkillTargetId } from './targets'

/**
 * Show a clack `select` over the 12 skill targets and return the user's
 * pick. `null` means the user cancelled (Ctrl-C or ESC) — callers should
 * bail without writing anything.
 */
export async function pickSkillTarget(
  defaultId: SkillTargetId | null = null,
): Promise<SkillTargetId | null> {
  const result = await p.select({
    message: 'Pick a skill target',
    initialValue: defaultId ?? 'claude',
    options: [
      target('claude'),
      target('claude-user'),
      target('cursor'),
      target('cursorrules'),
      target('cline'),
      target('windsurf'),
      target('aider'),
      target('copilot'),
      target('codex'),
      target('gemini'),
      target('raw'),
    ],
  })
  if (p.isCancel(result)) return null
  return result as SkillTargetId
}

function target(id: SkillTargetId): { value: SkillTargetId; label: string; hint: string } {
  const t = SKILL_TARGETS[id]
  return { value: id, label: t.label, hint: t.location }
}
