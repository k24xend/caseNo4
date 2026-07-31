/**
 * Vision UI audit for CI / local.
 *
 * - If ANTHROPIC_API_KEY is set: Claude vision per screenshot → vision-report.anthropic.json
 * - Always merges/uses apps/web/vision-report.json when present (local multimodal baseline)
 * - Exit 1 if any critical screen score < VISION_MIN_SCORE (default 7) when Claude ran
 *
 *   ANTHROPIC_API_KEY=... npm run vision:audit
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'screenshots');
const OUT_ANTHROPIC = path.join(ROOT, 'vision-report.anthropic.json');
const OUT_LOCAL = path.join(ROOT, 'vision-report.json');

const MIN = Number(process.env.VISION_MIN_SCORE || 7);
const REQUIRE_KEY = process.env.VISION_REQUIRE_KEY === 'true';

const AUDIT_PROMPT = `Ты — senior product designer уровня Linear / Vercel.
Проанализируй скриншот mobile UI (390×844) и сделай жёсткий аудит:

1. Spacing и вертикальный ритм
2. Визуальная иерархия
3. Типографика (размеры, вес, контраст)
4. Выравнивание и сетка
5. Контраст текста
6. Тени, границы, скругления
7. Общее ощущение "дороговизны" и спокойствия
8. Если это Overview: есть ли ТРИ отдельных стеклянных слоя кошелька (не одна панель)? Текст не обрезан?

Формат ответа СТРОГО JSON (без markdown):
{"score":1-10,"critical_issues":["..."],"improvements":["..."],"overall":"краткий вердикт"}`;

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

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

function loadLocalBaseline() {
  if (!fs.existsSync(OUT_LOCAL)) return [];
  try {
    return JSON.parse(fs.readFileSync(OUT_LOCAL, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  if (!fs.existsSync(SHOTS)) {
    console.error('No screenshots/ folder. Run: npm run capture:screens');
    process.exit(1);
  }
  const files = fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png'));
  if (!files.length) {
    console.error('No PNG screenshots found.');
    process.exit(1);
  }

  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasKey) {
    if (REQUIRE_KEY) {
      console.error('ANTHROPIC_API_KEY required (VISION_REQUIRE_KEY=true)');
      process.exit(1);
    }
    console.warn('ANTHROPIC_API_KEY not set — skipping Claude; using local vision-report.json if any');
    const local = loadLocalBaseline();
    if (!local.length) {
      console.warn('No local report either. Capture screens + set API key for full audit.');
      process.exit(0);
    }
    console.log(JSON.stringify(local, null, 2));
    process.exit(0);
  }

  try {
    await import('@anthropic-ai/sdk');
  } catch {
    console.error('Install @anthropic-ai/sdk: npm i -D @anthropic-ai/sdk');
    process.exit(1);
  }

  const results = [];
  let minScore = 10;
  let failFiles = [];

  for (const file of files) {
    const full = path.join(SHOTS, file);
    console.log('audit', file);
    const raw = await auditWithAnthropic(full);
    const parsed = extractJson(raw);
    const entry = { file, raw, analysis: parsed };
    results.push(entry);
    const score = parsed?.score;
    if (typeof score === 'number') {
      minScore = Math.min(minScore, score);
      // Fail hard only on overview/wallet shots by default
      if (score < MIN && /overview|wallet|money/i.test(file)) {
        failFiles.push(`${file}=${score}`);
      }
    }
  }

  fs.writeFileSync(OUT_ANTHROPIC, JSON.stringify(results, null, 2));
  console.log('wrote', OUT_ANTHROPIC);
  console.log('min_score', minScore, 'threshold', MIN);

  if (failFiles.length) {
    console.error('Vision scores below threshold:', failFiles.join(', '));
    process.exit(1);
  }
  console.log('Vision audit OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
