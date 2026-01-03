/**
 * exec 工具 (run_command 的別名)
 */

import { Tool } from "../types.js";
import { runCommandTool } from "./run_command.js";

/**
 * exec 工具是 run_command 的別名
 * 保持向後兼容性
 */
export const execTool: Tool = {
  definition: {
    ...runCommandTool.definition,
    name: "exec",
    description: "在當前工作目錄執行 shell 命令 (run_command 的別名)",
  },
  handler: runCommandTool.handler,
};
