/**
 * Git 相关工具函数
 */
import fs from "fs";
import path from "path";

/**
 * 从指定目录向上查找 Git 根目录
 * @param startDir 起始目录（默认为当前工作目录）
 * @returns Git 根目录路径，如果未找到则返回 null
 */
export function findGitRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(gitDir)) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * 检查指定目录是否在 Git 仓库中
 * @param dir 要检查的目录
 * @returns 如果在 Git 仓库中返回 true
 */
export function isInGitRepo(dir: string = process.cwd()): boolean {
  return findGitRoot(dir) !== null;
}

/**
 * 获取项目根目录（优先使用 Git 根目录，否则使用当前目录）
 * @param startDir 起始目录
 * @returns 项目根目录路径
 */
export function getProjectRoot(startDir: string = process.cwd()): string {
  return findGitRoot(startDir) || startDir;
}

/**
 * 获取相对于 Git 根目录的路径
 * @param filePath 文件路径
 * @param gitRoot Git 根目录（可选，自动检测）
 * @returns 相对路径，如果不在 Git 仓库中则返回原路径
 */
export function getRelativeToGitRoot(filePath: string, gitRoot?: string): string {
  const root = gitRoot || findGitRoot(path.dirname(filePath));
  if (!root) {
    return filePath;
  }
  return path.relative(root, filePath);
}
