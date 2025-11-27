export type ExecutionMode = "dry-run" | "review" | "auto-apply";

export interface SafetyPolicy {
  mode: ExecutionMode;
  allowedCommands?: string[];
  blockedCommands?: string[];
  maxCommandDurationMs?: number;
}

export function getDefaultPolicy(): SafetyPolicy {
  const modeEnv = process.env.BAILU_MODE as ExecutionMode | undefined;
  const mode: ExecutionMode = modeEnv ?? "review";
  return {
    mode,
    // Comprehensive list of dangerous commands
    blockedCommands: [
      // File system destructive operations
      "rm",
      "rm -rf",
      "rmdir",
      "del",
      "format",
      "mkfs",
      "dd",
      
      // System operations
      "shutdown",
      "reboot",
      "poweroff",
      "halt",
      "init",
      
      // Package managers (prevent unauthorized installations)
      "apt-get",
      "yum",
      "dnf",
      "pacman",
      "brew",
      "choco",
      
      // User/permission changes
      "chmod",
      "chown",
      "chgrp",
      "passwd",
      "sudo",
      "su",
      
      // Network operations (potential data exfiltration)
      "curl",
      "wget",
      "nc",
      "netcat",
      "telnet",
      
      // Disk operations
      "fdisk",
      "parted",
      "mount",
      "umount",
      
      // Process manipulation
      "kill",
      "killall",
      "pkill",
    ],
    maxCommandDurationMs: 5 * 60 * 1000,
  };
}

export function isCommandAllowed(policy: SafetyPolicy, command: string): boolean {
  if (policy.blockedCommands) {
    for (const banned of policy.blockedCommands) {
      if (command === banned || command.startsWith(`${banned} `)) {
        return false;
      }
    }
  }
  if (policy.allowedCommands && policy.allowedCommands.length > 0) {
    return policy.allowedCommands.some((allowed) => command === allowed || command.startsWith(`${allowed} `));
  }
  return true;
}


