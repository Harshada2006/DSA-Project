import { spawn } from 'child_process';
import fs from 'fs';
import { config } from '../config.js';

const ALLOWED_COMMANDS = new Set([
  'health',
  'prioritize',
  'shortest-path',
  'optimize-route',
]);

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB safety limit
const TIMEOUT_MS = 8000;

export async function executeCppEngine(command, payload) {
  const startTime = Date.now();

  // 1. Validate Command
  if (!ALLOWED_COMMANDS.has(command)) {
    return {
      success: false,
      command,
      error: `Invalid C++ engine command: "${command}". Allowed: ${Array.from(ALLOWED_COMMANDS).join(', ')}`,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Validate Executable Existence
  const exePath = config.cppEnginePath;
  if (!fs.existsSync(exePath)) {
    return {
      success: false,
      command,
      error: `C++ DSA Engine executable not found at "${exePath}". Please run "node scripts/build-cpp.js" to compile.`,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 3. Serialize and Validate Payload Size
  let inputString = '';
  if (payload !== undefined && payload !== null) {
    try {
      inputString = JSON.stringify(payload);
    } catch (err) {
      return {
        success: false,
        command,
        error: `Failed to serialize input JSON for C++ engine: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (Buffer.byteLength(inputString, 'utf8') > MAX_PAYLOAD_BYTES) {
      return {
        success: false,
        command,
        error: `Payload exceeds maximum allowed size of ${MAX_PAYLOAD_BYTES} bytes.`,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  // 4. Safe Subprocess Execution without shell
  return new Promise((resolve) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let timedOut = false;

    const child = spawn(exePath, [command], {
      shell: false, // Prevents shell injection
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      resolve({
        success: false,
        command,
        error: `C++ engine execution timed out after ${TIMEOUT_MS}ms.`,
        executionTimeMs: Date.now() - startTime,
      });
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      if (!timedOut) {
        resolve({
          success: false,
          command,
          error: `Subprocess spawn error: ${err.message}`,
          executionTimeMs: Date.now() - startTime,
        });
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      if (timedOut) return;

      const duration = Date.now() - startTime;

      if (code !== 0) {
        let errMessage = `C++ engine process exited with code ${code}.`;
        if (stderrBuffer.trim()) {
          errMessage += ` Stderr: ${stderrBuffer.trim()}`;
        }
        try {
          const parsed = JSON.parse(stdoutBuffer);
          if (parsed && parsed.error) errMessage += ` Engine error: ${parsed.error}`;
        } catch (_) {}

        return resolve({
          success: false,
          command,
          error: errMessage,
          executionTimeMs: duration,
        });
      }

      try {
        const parsed = JSON.parse(stdoutBuffer);
        return resolve({
          success: true,
          command,
          data: parsed,
          executionTimeMs: duration,
        });
      } catch (parseErr) {
        return resolve({
          success: false,
          command,
          error: `Failed to parse JSON output from C++ engine: ${parseErr.message}. Raw output: ${stdoutBuffer.slice(0, 300)}`,
          executionTimeMs: duration,
        });
      }
    });

    if (inputString) {
      child.stdin.write(inputString);
    }
    child.stdin.end();
  });
}
