/**
 * Auto TSC Fix Orchestrator
 * Stops on:
 *  1) Ctrl + C
 *  2) touch .STOP
 *  3) Max runtime exceeded
 * Success condition:
 *  - tsc-errors.txt size === 0
 */

import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

// ================= CONFIG =================
const MAX_RUNS = 50;
const ERROR_FILE = "tsc-errors_03-Feb.txt";
const STOP_FILE = ".STOP";
const MAX_TIME_MINUTES = 120; // ⏰ change as needed
// ==========================================

const START_TIME = Date.now();
let shouldStop = false;

// ---------- Signal Handling ----------
process.on("SIGINT", () => {
  console.log("\n🛑 Ctrl+C detected. Stopping safely...");
  shouldStop = true;
});

process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM received. Stopping safely...");
  shouldStop = true;
});

// ---------- Helpers ----------
function timeExceeded() {
  return Date.now() - START_TIME > MAX_TIME_MINUTES * 60 * 1000;
}

function stopFileExists() {
  return fs.existsSync(STOP_FILE);
}

// ---------- Core Actions ----------
function runTsc() {
  try {
    execSync(`npx tsc --noEmit > ${ERROR_FILE} 2>&1`, {
      stdio: "inherit",
    });
  } catch {
    // Expected when TSC errors exist
  }
}

async function callGemini(errorLog) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
Analyze the following TypeScript compiler errors and propose fixes.

Return:
1) Root cause
2) Files to change
3) Corrected code snippets

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
  return json?.candidates?.[0]?.content?.parts?.[0]?.text;
}

// ---------- Main Loop ----------
async function main() {
  console.log("🚀 Auto TSC Fixer started");
  console.log(`⏰ Max runtime: ${MAX_TIME_MINUTES} minutes`);
  console.log(`🛑 Stop file: ${STOP_FILE}`);

  for (let i = 1; i <= MAX_RUNS; i++) {
    if (shouldStop || timeExceeded() || stopFileExists()) {
      console.log("🧹 Stop condition met. Exiting.");
      break;
    }

    console.log(`\n🔁 TSC run ${i}/${MAX_RUNS}`);
    runTsc();

    if (!fs.existsSync(ERROR_FILE)) {
      console.log("⚠️ Error file not found. Stopping.");
      break;
    }

    const size = fs.statSync(ERROR_FILE).size;
    if (size === 0) {
      console.log("🎉 TSC clean (0-byte error file). Done.");
      break;
    }

    const errors = fs.readFileSync(ERROR_FILE, "utf8");
    console.log("❌ TSC errors found. Sending to Gemini...");

    const fix = await callGemini(errors);
    if (!fix) {
      console.log("⚠️ Gemini returned no response. Stopping.");
      break;
    }

    const fixFile = `gemini-tsc-fix-${i}.md`;
    fs.writeFileSync(fixFile, fix);
    console.log(`📄 Gemini suggestions written to ${fixFile}`);
  }

  console.log("👋 Auto TSC Fixer exited safely.");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
});

