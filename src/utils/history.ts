/**
 * 命令历史管理工具
 */
import fs from "fs";
import path from "path";

export class HistoryManager {
  private historyPath: string;
  private history: string[] = [];
  private maxHistorySize: number = 1000; // 最多保存1000条

  constructor(historyPath: string) {
    this.historyPath = historyPath;
    this.load();
  }

  /**
   * 从文件加载历史记录
   */
  private load(): void {
    try {
      // 确保目录存在
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 加载历史记录
      if (fs.existsSync(this.historyPath)) {
        const content = fs.readFileSync(this.historyPath, "utf-8");
        this.history = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }
    } catch (error) {
      // 加载失败不影响使用
      console.error("加载历史记录失败:", error);
      this.history = [];
    }
  }

  /**
   * 保存历史记录到文件
   */
  private save(): void {
    try {
      // 限制历史记录大小
      const toSave = this.history.slice(-this.maxHistorySize);
      fs.writeFileSync(this.historyPath, toSave.join("\n"), "utf-8");
    } catch (error) {
      // 保存失败不影响使用
      console.error("保存历史记录失败:", error);
    }
  }

  /**
   * 添加一条历史记录
   */
  add(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    // 避免重复的连续记录
    if (this.history.length > 0 && this.history[this.history.length - 1] === trimmed) {
      return;
    }

    this.history.push(trimmed);
    this.save();
  }

  /**
   * 获取所有历史记录
   */
  getAll(): string[] {
    return [...this.history];
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.save();
  }

  /**
   * 搜索历史记录
   */
  search(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter((cmd) => cmd.toLowerCase().includes(lowerQuery));
  }
}
