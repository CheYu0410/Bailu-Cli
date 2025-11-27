/**
 * 導出所有工具實現
 */

export { readFileTool } from "./read_file";
export { writeFileTool } from "./write_file";
export { listDirectoryTool } from "./list_directory";
export { runCommandTool } from "./run_command";
export { execTool } from "./exec";
export { applyDiffTool } from "./apply_diff";

import { Tool } from "../types";
import { readFileTool } from "./read_file";
import { writeFileTool } from "./write_file";
import { listDirectoryTool } from "./list_directory";
import { runCommandTool } from "./run_command";
import { execTool } from "./exec";
import { applyDiffTool } from "./apply_diff";

/**
 * 所有內建工具的列表
 */
export const builtinTools: Tool[] = [
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  runCommandTool,
  execTool, // exec 是 run_command 的別名
  applyDiffTool,
];
