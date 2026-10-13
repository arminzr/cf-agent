// ─────────────────────────────────────────────────
// Code Execution — E2B Sandbox (Linux terminal)
// Supports: Python, JavaScript, Bash, + 60 languages
// ─────────────────────────────────────────────────

import type { Env } from '../types';

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python3',
  javascript: 'node',
  js: 'node',
  bash: 'bash',
  sh: 'bash',
  typescript: 'npx tsx',
  go: 'go run',
  rust: 'rustc -o /tmp/out && /tmp/out',
};

export async function codeExec(code: string, language: string = 'python', env: Env): Promise<any> {
  const apiKey = env.E2B_API_KEY;
  if (!apiKey) {
    return { error: 'E2B API key not configured. Set E2B_API_KEY secret.' };
  }

  // Create sandbox
  const createRes = await fetch('https://api.e2b.dev/sandboxes', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template: 'base',
      timeout: 60,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    return { error: `E2B create failed (${createRes.status}): ${errText}` };
  }

  const sandbox = await createRes.json() as any;
  const sandboxId = sandbox.id;

  try {
    // Map language to shell command
    const lang = (language || 'python').toLowerCase();
    const executor = LANGUAGE_MAP[lang] || 'python3';

    // Write code to file
    const ext = lang === 'python' ? 'py' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'bash' || lang === 'sh' ? 'sh' : 'txt';
    const filename = `/tmp/code.${ext}`;

    const writeRes = await fetch(`https://api.e2b.dev/sandboxes/${sandboxId}/files`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filename, content: code }),
    });

    if (!writeRes.ok) {
      return { error: `E2B write failed: ${await writeRes.text()}` };
    }

    // Execute
    const execRes = await fetch(`https://api.e2b.dev/sandboxes/${sandboxId}/commands`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: `${executor} ${filename}`, timeout: 30 }),
    });

    if (!execRes.ok) {
      return { error: `E2B exec failed: ${await execRes.text()}` };
    }

    const execData = await execRes.json() as any;
    return {
      stdout: execData.stdout || '',
      stderr: execData.stderr || '',
      exitCode: execData.exitCode || 0,
      sandboxId,
    };
  } finally {
    // Kill sandbox to stop billing
    await fetch(`https://api.e2b.dev/sandboxes/${sandboxId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
  }
}
