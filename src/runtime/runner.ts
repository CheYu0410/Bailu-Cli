import { exec } from "child_process";
import { SafetyPolicy, getDefaultPolicy, isCommandAllowed } from "./policy.js";

export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
}

export function runCommandSafe(
  cwd: string,
  command: string,
  args: string[],
  policy: SafetyPolicy = getDefaultPolicy()
): Promise<CommandResult> {
  const full = args.length > 0 ? `${command} ${args.join(" ")}` : command;
  if (!isCommandAllowed(policy, full)) {
    return Promise.reject(new Error(`命令被安全策略阻止：${full}`));
  }

  const timeoutMs = policy.maxCommandDurationMs ?? 5 * 60 * 1000;

  return new Promise<CommandResult>((resolve, reject) => {
    let finished = false;
    let timedOut = false;

    const child = exec(
      full,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          BAILU_MODE: policy.mode,
        },
      },
      (error, stdout, stderr) => {
        if (finished) return;
        finished = true;

        const result: CommandResult = {
          command,
          args,
          exitCode: error?.code ?? 0,
          timedOut: error?.killed ?? false,
          stdout: stdout || "",
          stderr: stderr || "",
        };

        if (error?.killed) {
          timedOut = true;
        }

        resolve(result);
      }
    );

    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });
  });
}
