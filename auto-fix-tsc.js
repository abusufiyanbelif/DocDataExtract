import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

const MAX_RUNS = 10;
const ERROR_FILE = "tsc-errors.txt";

async function runTsc() {
  try {
    execSync(`npx tsc --noEmit > ${ERROR_FILE} 2>&1`, {
      stdio: "inherit",
    });
  } catch {
    // tsc returns non-zero on errors – expected
  }
}

async function callGemini(errorLog) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
You are a senior TypeScript engineer.
Analyze the following tsc errors and return:
1. File paths
2. Exact code changes (diff style)
3. Explanation

Errors:
${errorLog}
`,
              },
            ],
          },
        ],
      }),
    }
  );

  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function main() {
  for (let i = 1; i <= MAX_RUNS; i++) {
    console.log(`\n🔁 Run ${i}`);

    await runTsc();

    if (!fs.existsSync(ERROR_FILE)) {
      console.log("✅ No error file. Done.");
      return;
    }

    const size = fs.statSync(ERROR_FILE).size;
    if (size === 0) {
      console.log("🎉 TSC clean. Done.");
      return;
    }

    const errors = fs.readFileSync(ERROR_FILE, "utf8");
    console.log("❌ Errors found, sending to Gemini...");

    const fix = await callGemini(errors);

    if (!fix) {
      console.log("⚠️ Gemini returned nothing. Stopping.");
      return;
    }

    fs.writeFileSync(`gemini-fix-${i}.md`, fix);
    console.log("📄 Gemini suggestions saved.");

    // ⚠️ IMPORTANT:
    // At this point you either:
    // - manually apply fixes
    // - OR write a patch applier (dangerous but possible)
    console.log("🛑 Apply fixes and rerun.");
    return;
  }
}

main();

