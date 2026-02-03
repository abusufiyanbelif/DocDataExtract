/**
 * Auto Build Fix Orchestrator
 * Stops on:
 *  1) Ctrl + C
 *  2) touch .STOP
 *  3) Max runtime exceeded
 */

import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

// ================= CONFIG =================
const MAX_RUNS = 30;
const BUILD_LOG = "build-errors-03-feb.txt";
const STOP_FILE = ".STOP";
const MAX_TIME_MINUTES = 180; // ⏰ change as needed
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
function runBuild() {
  try {
    execSync(`npm run build > ${BUILD_LOG} 2>&1`, {
      stdio: "inherit",
    });
    return true; // build success
  } catch {
    return false; // build failed
  }
}

async function callGemini(buildLog) {
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
You are a senior full-stack engineer.
The following "npm run build" failed.
Analyze the error and propose exact fixes.

Return:
1) Root cause
2) Files to change
3) Code snippets
4) Commands if needed

Build log:
${buildLog}
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
  console.log("🚀 Auto Build Fixer started");
  console.log(`⏰ Max runtime: ${MAX_TIME_MINUTES} minutes`);
  console.log(`🛑 Stop file: ${STOP_FILE}`);

  for (let i = 1; i <= MAX_RUNS; i++) {
    if (shouldStop || timeExceeded() || stopFileExists()) {
      console.log("🧹 Stop condition met. Exiting.");
      break;
    }

    console.log(`\n🔁 Build attempt ${i}/${MAX_RUNS}`);

    const success = runBuild();
    if (success) {
      console.log("🎉 npm run build SUCCESS");
      fs.writeFileSync("BUILD_SUCCESS", new Date().toISOString());
      break;
    }

    if (!fs.existsSync(BUILD_LOG)) {
      console.log("⚠️ No build log found. Stopping.");
      break;
    }

    const log = fs.readFileSync(BUILD_LOG, "utf8");
    console.log("❌ Build failed. Sending log to Gemini...");

    const fix = await callGemini(log);
    if (!fix) {
      console.log("⚠️ Gemini returned no response. Stopping.");
      break;
    }

    const fixFile = `gemini-build-fix-${i}.md`;
    fs.writeFileSync(fixFile, fix);
    console.log(`📄 Gemini suggestions written to ${fixFile}`);
  }

  console.log("👋 Auto Build Fixer exited safely.");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
});

