const { execFileSync, spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || "5000";

const getListeningPids = () => {
  try {
    const output = execFileSync("netstat", ["-ano"], {
      encoding: "utf8",
      windowsHide: true,
    });

    return [
      ...new Set(
        output
          .split(/\r?\n/)
          .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && pid !== "0" && pid !== String(process.pid))
      ),
    ];
  } catch (error) {
    console.warn(`Could not inspect port ${port}. Continuing with nodemon.`);
    return [];
  }
};

getListeningPids().forEach((pid) => {
  try {
    execFileSync("taskkill", ["/PID", pid, "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    console.log(`Stopped previous backend process on port ${port} (PID ${pid}).`);
  } catch (error) {
    console.warn(`Could not stop process ${pid} on port ${port}.`);
  }
});

const nodemonBin =
  process.platform === "win32"
    ? path.join(__dirname, "..", "node_modules", ".bin", "nodemon.cmd")
    : path.join(__dirname, "..", "node_modules", ".bin", "nodemon");

const child = spawn(nodemonBin, ["server.js"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
