/**
 * Optional Claude vision audit (requires ANTHROPIC_API_KEY).
 * Without the key, use vision-report.json from local multimodal audit.
 *
 *   cd apps/web
 *   ANTHROPIC_API_KEY=... node scripts/vision-audit.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, '..', 'screenshots');
const OUT = path.join(__dirname, '..', 'vision-report.anthropic.json');

const AUDIT_PROMPT = `Ты — senior product designer уровня Linear / Vercel.
Проанализируй скриншот интерфейса (mobile 390×844) и сделай жёсткий аудит:
1. Spacing и вертикальный ритм
2. Визуальная иерархия
3. Типографика
4. Выравнивание и сетка
5. Контраст
6. Тени, границы, скругления
7. Ощущение дороговизны и спокойствия
8. Для Overview: есть ли ТРИ отдельных стеклянных слоя кошелька (не одна панель)?

Формат строго JSON:
{"score":1-10,"critical_issues":["..."],"improvements":["..."],"overall":"..."}`;

async function auditWithAnthropic(filePath) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const image = fs.readFileSync(filePath).toString('base64');
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
          { type: 'text', text: AUDIT_PROMPT },
        ],
      },
    ],
  });
  const block = response.content.find((c) => c.type === 'text');
  return block?.text ?? '';
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Local report: apps/web/vision-report.json');
    process.exit(1);
  }
  const files = fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png'));
  const results = [];
  for (const file of files) {
    console.log('audit', file);
    const analysis = await auditWithAnthropic(path.join(SHOTS, file));
    results.push({ file, analysis });
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log('wrote', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
