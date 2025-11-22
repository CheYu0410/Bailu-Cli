/**
 * 依赖分析系统
 * 分析文件之间的依赖关系，评估修改影响
 */

import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

/**
 * 文件依赖信息
 */
export interface FileDependency {
  path: string;                    // 文件路径
  imports: string[];               // 该文件导入的其他文件
  usedBy: string[];                // 该文件被哪些文件使用
  type: FileType;                  // 文件类型
  lastAnalyzed: Date;              // 最后分析时间
}

/**
 * 文件类型
 */
export enum FileType {
  HTML = "html",
  CSS = "css",
  JAVASCRIPT = "javascript",
  TYPESCRIPT = "typescript",
  JSON = "json",
  MARKDOWN = "markdown",
  UNKNOWN = "unknown",
}

/**
 * 依赖关系类型
 */
export enum DependencyType {
  IMPORT = "import",           // ES6 import
  REQUIRE = "require",         // CommonJS require
  LINK = "link",               // HTML <link>
  SCRIPT = "script",           // HTML <script>
  STYLE = "style",             // CSS @import
  IMAGE = "image",             // <img src>
  REFERENCE = "reference",     // 其他引用
}

/**
 * 依赖关系
 */
export interface Dependency {
  from: string;                // 源文件
  to: string;                  // 目标文件
  type: DependencyType;        // 依赖类型
  line?: number;               // 所在行号
}

/**
 * 影响分析结果
 */
export interface ImpactAnalysis {
  targetFile: string;          // 目标文件
  directImpact: string[];      // 直接影响的文件
  indirectImpact: string[];    // 间接影响的文件
  totalImpact: number;         // 总影响文件数
  riskLevel: RiskLevel;        // 风险等级
  suggestions: string[];       // 建议
}

/**
 * 风险等级
 */
export enum RiskLevel {
  LOW = "low",           // 低风险：影响 0-2 个文件
  MEDIUM = "medium",     // 中风险：影响 3-5 个文件
  HIGH = "high",         // 高风险：影响 6-10 个文件
  CRITICAL = "critical", // 严重：影响 >10 个文件
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  [filePath: string]: FileDependency;
}

/**
 * 依赖分析管理器
 */
export class DependencyAnalyzer {
  private graph: DependencyGraph = {};
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * 识别文件类型
   */
  private identifyFileType(filePath: string): FileType {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".html":
      case ".htm":
        return FileType.HTML;
      case ".css":
        return FileType.CSS;
      case ".js":
      case ".mjs":
        return FileType.JAVASCRIPT;
      case ".ts":
      case ".tsx":
        return FileType.TYPESCRIPT;
      case ".json":
        return FileType.JSON;
      case ".md":
      case ".markdown":
        return FileType.MARKDOWN;
      default:
        return FileType.UNKNOWN;
    }
  }

  /**
   * 扫描 HTML 文件的依赖
   */
  private scanHtmlDependencies(filePath: string, content: string): string[] {
    const dependencies: string[] = [];
    const dir = path.dirname(filePath);

    // 匹配 <link href="...">
    const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[1];
      if (!href.startsWith("http") && !href.startsWith("//")) {
        const resolved = path.resolve(dir, href);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    // 匹配 <script src="...">
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    while ((match = scriptRegex.exec(content)) !== null) {
      const src = match[1];
      if (!src.startsWith("http") && !src.startsWith("//")) {
        const resolved = path.resolve(dir, src);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    // 匹配 <img src="...">
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      const src = match[1];
      if (!src.startsWith("http") && !src.startsWith("//") && !src.startsWith("data:")) {
        const resolved = path.resolve(dir, src);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    return dependencies;
  }

  /**
   * 扫描 CSS 文件的依赖
   */
  private scanCssDependencies(filePath: string, content: string): string[] {
    const dependencies: string[] = [];
    const dir = path.dirname(filePath);

    // 匹配 @import "..."
    const importRegex = /@import\s+["']([^"']+)["']/gi;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith("http")) {
        const resolved = path.resolve(dir, importPath);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    // 匹配 url(...)
    const urlRegex = /url\(["']?([^"')]+)["']?\)/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      const urlPath = match[1];
      if (!urlPath.startsWith("http") && !urlPath.startsWith("data:") && !urlPath.startsWith("#")) {
        const resolved = path.resolve(dir, urlPath);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    return dependencies;
  }

  /**
   * 扫描 JavaScript/TypeScript 文件的依赖
   */
  private scanJsDependencies(filePath: string, content: string): string[] {
    const dependencies: string[] = [];
    const dir = path.dirname(filePath);

    // 匹配 import ... from "..."
    const importRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/gi;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith(".")) {
        const resolved = path.resolve(dir, importPath);
        // 添加可能的扩展名
        const possiblePaths = [
          resolved,
          resolved + ".js",
          resolved + ".ts",
          resolved + ".tsx",
          resolved + "/index.js",
          resolved + "/index.ts",
        ];

        for (const p of possiblePaths) {
          const relative = path.relative(this.rootPath, p);
          if (!dependencies.includes(relative)) {
            dependencies.push(relative);
            break; // 只添加第一个匹配的
          }
        }
      }
    }

    // 匹配 import("...")
    const dynamicImportRegex = /import\(["']([^"']+)["']\)/gi;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith(".")) {
        const resolved = path.resolve(dir, importPath);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    // 匹配 require("...")
    const requireRegex = /require\(["']([^"']+)["']\)/gi;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      if (requirePath.startsWith(".")) {
        const resolved = path.resolve(dir, requirePath);
        dependencies.push(path.relative(this.rootPath, resolved));
      }
    }

    return dependencies;
  }

  /**
   * 分析单个文件的依赖
   */
  analyzeFile(filePath: string): FileDependency | null {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.rootPath, filePath);

      if (!fs.existsSync(absolutePath)) {
        console.log(chalk.yellow(`[依賴分析] 文件不存在: ${filePath}`));
        return null;
      }

      const content = fs.readFileSync(absolutePath, "utf-8");
      const fileType = this.identifyFileType(filePath);
      let imports: string[] = [];

      // 根据文件类型扫描依赖
      switch (fileType) {
        case FileType.HTML:
          imports = this.scanHtmlDependencies(filePath, content);
          break;
        case FileType.CSS:
          imports = this.scanCssDependencies(filePath, content);
          break;
        case FileType.JAVASCRIPT:
        case FileType.TYPESCRIPT:
          imports = this.scanJsDependencies(filePath, content);
          break;
        default:
          // 其他类型不分析依赖
          break;
      }

      // 去重和规范化路径
      imports = [...new Set(imports)].map(p => path.normalize(p).replace(/\\/g, "/"));

      const dependency: FileDependency = {
        path: filePath,
        imports,
        usedBy: [], // 稍后计算
        type: fileType,
        lastAnalyzed: new Date(),
      };

      // 存储到图中
      this.graph[filePath] = dependency;

      console.log(chalk.gray(`[依賴分析] ${filePath}: 找到 ${imports.length} 個依賴`));

      return dependency;
    } catch (error) {
      console.error(chalk.red(`[依賴分析] 分析失敗: ${filePath}`), error);
      return null;
    }
  }

  /**
   * 构建完整的依赖图
   */
  buildGraph(files: string[]): void {
    console.log(chalk.cyan(`\n[依賴分析] 開始構建依賴圖...`));
    console.log(chalk.gray(`   文件數量: ${files.length}`));

    // 第一轮：分析所有文件的 imports
    for (const file of files) {
      this.analyzeFile(file);
    }

    // 第二轮：计算 usedBy（反向依赖）
    for (const [filePath, dep] of Object.entries(this.graph)) {
      for (const importPath of dep.imports) {
        // 规范化路径
        const normalizedImport = path.normalize(importPath).replace(/\\/g, "/");

        // 查找匹配的文件
        for (const [targetPath, targetDep] of Object.entries(this.graph)) {
          const normalizedTarget = path.normalize(targetPath).replace(/\\/g, "/");

          if (
            normalizedTarget === normalizedImport ||
            normalizedTarget.startsWith(normalizedImport)
          ) {
            if (!targetDep.usedBy.includes(filePath)) {
              targetDep.usedBy.push(filePath);
            }
          }
        }
      }
    }

    console.log(chalk.green(`✓ [依賴分析] 依賴圖構建完成`));
    console.log(chalk.gray(`   分析了 ${Object.keys(this.graph).length} 個文件`));
  }

  /**
   * 分析修改某个文件的影响
   */
  analyzeImpact(filePath: string): ImpactAnalysis {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");
    const dependency = this.graph[normalizedPath];

    if (!dependency) {
      return {
        targetFile: filePath,
        directImpact: [],
        indirectImpact: [],
        totalImpact: 0,
        riskLevel: RiskLevel.LOW,
        suggestions: ["文件不在依赖图中，无法分析影响"],
      };
    }

    // 直接影响：直接使用该文件的文件
    const directImpact = [...dependency.usedBy];

    // 间接影响：使用直接影响文件的文件（递归）
    const indirectImpact: string[] = [];
    const visited = new Set<string>([normalizedPath, ...directImpact]);

    const findIndirect = (files: string[]) => {
      for (const file of files) {
        const dep = this.graph[file];
        if (dep) {
          for (const user of dep.usedBy) {
            if (!visited.has(user)) {
              visited.add(user);
              indirectImpact.push(user);
              findIndirect([user]); // 递归
            }
          }
        }
      }
    };

    findIndirect(directImpact);

    const totalImpact = directImpact.length + indirectImpact.length;

    // 评估风险等级
    let riskLevel: RiskLevel;
    if (totalImpact === 0) {
      riskLevel = RiskLevel.LOW;
    } else if (totalImpact <= 2) {
      riskLevel = RiskLevel.LOW;
    } else if (totalImpact <= 5) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (totalImpact <= 10) {
      riskLevel = RiskLevel.HIGH;
    } else {
      riskLevel = RiskLevel.CRITICAL;
    }

    // 生成建议
    const suggestions: string[] = [];

    if (totalImpact === 0) {
      suggestions.push("该文件未被其他文件使用，修改风险低");
    } else {
      suggestions.push(`修改后需要验证 ${totalImpact} 个相关文件`);

      if (directImpact.length > 0) {
        suggestions.push(`直接影响 ${directImpact.length} 个文件：${directImpact.slice(0, 3).join(", ")}${directImpact.length > 3 ? "..." : ""}`);
      }

      if (indirectImpact.length > 0) {
        suggestions.push(`间接影响 ${indirectImpact.length} 个文件`);
      }

      if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
        suggestions.push("⚠️ 高风险修改，建议小心操作并充分测试");
      }
    }

    return {
      targetFile: filePath,
      directImpact,
      indirectImpact,
      totalImpact,
      riskLevel,
      suggestions,
    };
  }

  /**
   * 获取依赖图
   */
  getGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * 获取文件的依赖信息
   */
  getFileDependency(filePath: string): FileDependency | undefined {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");
    return this.graph[normalizedPath];
  }

  /**
   * 清除依赖图
   */
  clearGraph(): void {
    this.graph = {};
    console.log(chalk.gray(`[依賴分析] 已清除依賴圖`));
  }

  /**
   * 导出依赖图（用于持久化）
   */
  exportGraph(): string {
    return JSON.stringify(this.graph, null, 2);
  }

  /**
   * 导入依赖图（从持久化恢复）
   */
  importGraph(data: string): void {
    try {
      this.graph = JSON.parse(data);
      console.log(chalk.green(`✓ [依賴分析] 已導入依賴圖 (${Object.keys(this.graph).length} 個文件)`));
    } catch (error) {
      console.error(chalk.red(`[依賴分析] 導入失敗:`, error));
    }
  }

  /**
   * 获取依赖统计
   */
  getStats(): {
    totalFiles: number;
    totalDependencies: number;
    mostUsedFiles: Array<{ file: string; usedBy: number }>;
    isolatedFiles: string[];
  } {
    const totalFiles = Object.keys(this.graph).length;
    let totalDependencies = 0;
    const isolatedFiles: string[] = [];

    for (const [filePath, dep] of Object.entries(this.graph)) {
      totalDependencies += dep.imports.length;

      if (dep.imports.length === 0 && dep.usedBy.length === 0) {
        isolatedFiles.push(filePath);
      }
    }

    // 找出最常被使用的文件
    const mostUsedFiles = Object.entries(this.graph)
      .map(([file, dep]) => ({ file, usedBy: dep.usedBy.length }))
      .filter(item => item.usedBy > 0)
      .sort((a, b) => b.usedBy - a.usedBy)
      .slice(0, 10);

    return {
      totalFiles,
      totalDependencies,
      mostUsedFiles,
      isolatedFiles,
    };
  }
}
