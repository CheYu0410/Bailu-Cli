/**
 * 斜線命令自動補全
 */

import inquirer from "inquirer";
import chalk from "chalk";

export interface SlashCommandDef {
  command: string;
  alias?: string;
  description: string;
  usage?: string;
}

export const slashCommands: SlashCommandDef[] = [
  { command: "/help", alias: "/h", description: "顯示幫助信息" },
  { command: "/status", alias: "/s", description: "查看 CLI 狀態、模型、token 使用" },
  { command: "/tokens", alias: "/t", description: "查看 token 使用詳情" },
  { command: "/model", alias: "/m", description: "切換或查看當前模型", usage: "/model [模型ID]" },
  { command: "/models", description: "列出所有可用模型" },
  { command: "/history", description: "顯示對話歷史摘要" },
  { command: "/compress", description: "壓縮對話上下文（保留最近 3 輪）" },
  { command: "/settings", description: "查看或修改配置", usage: "/settings [set <key> <value>]" },
  { command: "/mode", description: "切換安全模式", usage: "/mode [dry-run|review|auto-apply]" },
  { command: "/clear", alias: "/c", description: "清空對話歷史" },
  { command: "/exit", alias: "/q", description: "退出 CLI" },
];

/**
 * 顯示斜線命令選擇器
 */
export async function showSlashCommandPicker(): Promise<string | null> {
  const choices = slashCommands.map((cmd) => {
    const name = cmd.alias
      ? `${chalk.green(cmd.command)} ${chalk.gray(`(${cmd.alias})`)}`
      : chalk.green(cmd.command);
    const desc = chalk.gray(` - ${cmd.description}`);
    const usage = cmd.usage ? chalk.yellow(`  ${cmd.usage}`) : "";
    
    return {
      name: `${name}${desc}${usage ? "\n    " + usage : ""}`,
      value: cmd.command,
      short: cmd.command,
    };
  });

  // 添加取消選項
  choices.push({
    name: chalk.gray("(取消，返回輸入)"),
    value: "__cancel__",
    short: "取消",
  });

  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "command",
        message: "選擇一個命令：",
        choices,
        pageSize: 15,
      },
    ]);

    return answer.command === "__cancel__" ? null : answer.command;
  } catch {
    // 用戶取消（Ctrl+C）
    return null;
  }
}

/**
 * 根據輸入過濾命令
 */
export function filterCommands(input: string): SlashCommandDef[] {
  const normalizedInput = input.toLowerCase().trim();

  if (!normalizedInput || normalizedInput === "/") {
    return slashCommands;
  }

  return slashCommands.filter(
    (cmd) =>
      cmd.command.toLowerCase().startsWith(normalizedInput) ||
      (cmd.alias && cmd.alias.toLowerCase().startsWith(normalizedInput))
  );
}

/**
 * 獲取命令建議（用於自動補全提示）
 */
export function getCommandSuggestions(input: string): string[] {
  const filtered = filterCommands(input);
  return filtered.map((cmd) => cmd.command);
}

