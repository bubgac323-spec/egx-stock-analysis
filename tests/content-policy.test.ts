import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { findForbiddenPhrases } from "../src/lib/content-policy";

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

describe("سياسة المحتوى وأمان المفاتيح", () => {
  const srcDir = path.join(process.cwd(), "src");
  const files = walk(srcDir).filter(
    (f) => !f.endsWith(path.join("lib", "content-policy.ts"))
  );

  it("لا تحتوي أي صفحة أو مكون في الواجهة على عبارات محظورة أو وعود بالربح", () => {
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const found = findForbiddenPhrases(content);
      expect(found, `وُجدت عبارات محظورة في ${file}: ${found.join(", ")}`).toEqual([]);
    }
  });

  it("لا يوجد أي مفتاح Mansa سري مكتوب داخل كود المصدر", () => {
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content.includes("mansa_live_sk_"), `مفتاح سري مسرّب في ${file}`).toBe(false);
    }
  });
});
