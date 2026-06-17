// ============================================================
// PAWLY — predev guard
// Runs automatically before `next dev` (npm/bun `predev` hook). It clears the
// two things that cause the Turbopack worker panic on Windows
// ("An existing connection was forcibly closed (os error 10054)"):
//   1. a half-written `.next` cache left by an unclean shutdown, and
//   2. an orphaned dev process still holding the dev port.
// Everything is best-effort: any failure is swallowed so it can never block
// the dev server from starting.
// ============================================================

import { rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;

/** Remove the Turbopack/Next dev cache (the usual panic source). */
function clearCache() {
  for (const dir of [".next", "node_modules/.cache"]) {
    try {
      rmSync(join(projectRoot, dir), { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}

/** Kill any process still listening on the dev port (orphaned dev server). */
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        // Match "...:<port>" in the LISTENING column and grab the trailing PID.
        if (/LISTENING/.test(line) && new RegExp(`[:.]${port}\\b`).test(line)) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== "0") pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`[predev] freed port ${port} (killed PID ${pid})`);
        } catch {
          /* already gone */
        }
      }
    } else {
      // macOS / Linux
      const pids = execSync(`lsof -ti tcp:${port} || true`, { encoding: "utf8" })
        .split(/\s+/)
        .filter(Boolean);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          console.log(`[predev] freed port ${port} (killed PID ${pid})`);
        } catch {
          /* already gone */
        }
      }
    }
  } catch {
    /* netstat/lsof unavailable — ignore */
  }
}

freePort(PORT);
clearCache();
console.log(`[predev] dev cache cleared, port ${PORT} ready`);
