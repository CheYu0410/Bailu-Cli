/**
 * 程式碼語法高亮工具
 */

import { highlight } from 'cli-highlight';
import chalk from 'chalk';

/**
 * 高亮單個程式碼區塊
 */
export function highlightCode(code: string, language?: string): string {
  try {
    return highlight(code, { 
      language: language || 'javascript',
      ignoreIllegals: true,
      theme: {
        keyword: chalk.cyan,
        built_in: chalk.cyan,
        string: chalk.green,
        number: chalk.yellow,
        comment: chalk.gray,
        function: chalk.blue,
        class: chalk.magenta,
      }
    });
  } catch (error) {
    // 降級：返回原始程式碼
    return code;
  }
}

/**
 * 處理包含程式碼區塊的回覆內容
 * 匹配 Markdown 格式：```language\ncode\n```
 */
export function processResponseWithHighlight(content: string): string {
  // 匹配 Markdown 程式碼區塊
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  return content.replace(codeBlockRegex, (match, lang, code) => {
    const trimmedCode = code.trim();
    const highlighted = highlightCode(trimmedCode, lang);
    
    // 添加程式碼區塊標記
    const langLabel = lang ? chalk.gray(`[${lang}]`) : chalk.gray('[code]');
    return `\n${langLabel}\n${highlighted}\n`;
  });
}

/**
 * 檢測內容是否包含程式碼區塊
 */
export function hasCodeBlocks(content: string): boolean {
  return /```(\w+)?\n[\s\S]*?```/.test(content);
}
