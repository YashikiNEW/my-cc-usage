import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type DayUsage = {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUSD: number; // 合計
};

// 価格テーブル（必要に応じて調整）
const PRICES = {
  inputPerMTok: 15.0,
  outputPerMTok: 75.0,
  cacheCreationPerMTok: 18.75,
  cacheReadPerMTok: 1.5
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getClaudeProjectsDir(): string {
  const home = os.homedir();
  return path.join(home, '.claude', 'projects');
}

export function readUsageLastNDays(days = 7): DayUsage[] {
  const dir = getClaudeProjectsDir();
  if (!fs.existsSync(dir)) return [];

  const byDay = new Map<string, DayUsage>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateStr(d);
    byDay.set(key, {
      date: key,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      costUSD: 0
    });
  }

  // 各プロジェクト配下の JSONL を総なめ
  const projects = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const p of projects) {
    const pdir = path.join(dir, p.name);
    const files = fs.readdirSync(pdir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const full = path.join(pdir, file);
      const lines = fs.readFileSync(full, 'utf-8').split(/\n+/).filter(Boolean);
      for (const line of lines) {
        try {
          const j = JSON.parse(line);
          // 日付の判断：createdAt または timestamp 等（両対応）
          const ts: string | number | Date | undefined = j.createdAt ?? j.timestamp;
          let parsedDate: Date;
          if (ts instanceof Date) {
            parsedDate = ts;
          } else if (typeof ts === 'number' || typeof ts === 'string') {
            const tentative = new Date(ts);
            parsedDate = Number.isNaN(tentative.getTime()) ? new Date() : tentative;
          } else {
            parsedDate = new Date();
          }
          const date = toDateStr(parsedDate);
          const rec = byDay.get(date);
          if (!rec) continue;

          // costUSD があればそのまま加算、無ければトークンから計算
          const inputTok = Number(j.inputTokens ?? 0);
          const outputTok = Number(j.outputTokens ?? 0);
          const cacheCreateTok = Number(j.cacheCreationTokens ?? 0);
          const cacheReadTok = Number(j.cacheReadTokens ?? 0);

          let cost = Number(j.costUSD ?? 0);
          if (!j.costUSD) {
            cost =
              (inputTok / 1_000_000) * PRICES.inputPerMTok +
              (outputTok / 1_000_000) * PRICES.outputPerMTok +
              (cacheCreateTok / 1_000_000) * PRICES.cacheCreationPerMTok +
              (cacheReadTok / 1_000_000) * PRICES.cacheReadPerMTok;
          }

          rec.inputTokens += inputTok;
          rec.outputTokens += outputTok;
          rec.cacheCreationTokens += cacheCreateTok;
          rec.cacheReadTokens += cacheReadTok;
          rec.costUSD += cost;
        } catch (_) {
          // 1行壊れていても無視
        }
      }
    }
  }

  // 日付順で戻す（新しい順）
  return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}
