# PasteDetector 集成指南

## 修改文件：`src/agent/chat.ts`

### 步骤 1：修改导入语句（第19行）

**查找：**
```typescript
import { BracketedPasteHandler } from "../utils/bracketed-paste";
```

**替换为：**
```typescript
import { PasteDetector } from "../utils/paste-detector";
```

---

### 步骤 2：修改类属性声明（第52行）

**查找：**
```typescript
private bracketedPaste: BracketedPasteHandler; // Bracketed Paste Mode 处理器
```

**替换为：**
```typescript
private pasteDetector!: PasteDetector; // 粘贴检测器
```

---

### 步骤 3：修改构造函数初始化（第93-105行）

**查找这段代码：**
```typescript
// 初始化会话管理器
this.sessionManager = new ChatSessionManager();

// 初始化 Bracketed Paste Mode 处理器
this.bracketedPaste = new BracketedPasteHandler();

this.rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.cyan("\n你: "),
  terminal: true, // 确保作为终端模式运行
  crlfDelay: Infinity, // 处理 Windows 的 CRLF，避免重复行
});
```

**替换为：**
```typescript
// 初始化会话管理器
this.sessionManager = new ChatSessionManager();

this.rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.cyan("\n你: "),
  terminal: true, // 确保作为终端模式运行
  crlfDelay: Infinity, // 处理 Windows 的 CRLF，避免重复行
});

// 初始化粘贴检测器
this.pasteDetector = new PasteDetector({
  delay: 50,
  onComplete: async (lines, isPaste) => {
    if (isPaste) {
      // 多行粘贴
      await this.handlePastedInput(lines.join('\n'));
    } else {
      // 单行输入
      await this.handleSingleLine(lines[0]);
    }
  },
});
```

---

### 步骤 4：简化 `start()` 方法（第111-152行）

**查找这段代码：**
```typescript
async start(): Promise<void> {
  this.printWelcome();
  
  // 启用 Bracketed Paste Mode
  this.bracketedPaste.enable();

  // 确保退出时禁用 Bracketed Paste Mode
  const cleanup = () => {
    this.bracketedPaste.disable();
  };
  process.on('exit', cleanup);
  process.on('SIGTERM', cleanup);
  
  // Ctrl+C 处理：第一次提示，第二次（3秒内）退出
  let lastSigintTime: number | null = null;
  process.on('SIGINT', () => {
    const now = Date.now();
    
    if (lastSigintTime && (now - lastSigintTime) < 3000) {
      // 3秒内第二次 Ctrl+C，退出
      this.bracketedPaste.disable();
      console.log(chalk.gray("\n\n再見！"));
      process.exit(0);
    } else {
      // 第一次 Ctrl+C，提示
      console.log(chalk.yellow("\n\n[提示] 再按一次 Ctrl+C (3秒内) 退出，或輸入 'exit' 退出"));
      lastSigintTime = now;
      this.rl.prompt();
    }
  });

  this.rl.prompt();
```

**替换为：**
```typescript
async start(): Promise<void> {
  this.printWelcome();
  
  // Ctrl+C 处理：第一次提示，第二次（3秒内）退出
  let lastSigintTime: number | null = null;
  process.on('SIGINT', () => {
    const now = Date.now();
    
    if (lastSigintTime && (now - lastSigintTime) < 3000) {
      // 3秒内第二次 Ctrl+C，退出
      this.pasteDetector.destroy();
      console.log(chalk.gray("\n\n再見！"));
      process.exit(0);
    } else {
      // 第一次 Ctrl+C，提示
      console.log(chalk.yellow("\n\n[提示] 再按一次 Ctrl+C (3秒内) 退出，或輸入 'exit' 退出"));
      lastSigintTime = now;
      this.rl.prompt();
    }
  });

  this.rl.prompt();
```

---

### 步骤 5：简化 `line` 事件处理器（第144-181行）

**查找从 `this.rl.on("line", async (input) => {` 开始的整个事件处理器，包括所有 Bracketed Paste Mode 检测和处理的代码：**

```typescript
this.rl.on("line", async (input) => {
  // Bracketed Paste Mode 检测和处理
  const pasteResult = this.bracketedPaste.handleInput(input);
  
  if (pasteResult.isPaste) {
    // 如果是粘贴且已完成，处理粘贴内容
    if (pasteResult.pasteContent) {
      await this.handlePastedInput(pasteResult.pasteContent);
    }
    // 如果是粘贴但未完成，等待后续数据
    return;
  }

  // 使用处理后的数据（已移除粘贴标记）
  input = pasteResult.data;

  // Windows 终端会重复显示输入，主动清除并重新显示一次
  if (process.platform === 'win32' && input && process.stdout.isTTY) {
    // 向上移动一行并清除（清除重复的输入）
    // Only use ANSI codes if terminal supports it
    process.stdout.write(
      this.ANSI_MOVE_UP + this.ANSI_CLEAR_LINE + this.ANSI_CARRIAGE_RETURN
    );
    // 重新显示一次（保留 prompt）
    console.log(chalk.cyan("你: ") + input);
  }
  
  // 多行输入模式处理
  if (this.isMultiLineMode) {
    // ... 后面还有很多代码
```

**替换为：**
```typescript
this.rl.on("line", (input) => {
  // 使用粘贴检测器处理所有输入
  this.pasteDetector.push(input);
});

this.rl.on("close", () => {
  this.pasteDetector.destroy();
});
```

**注意：** 删除整个原来的 `line` 事件处理器内部逻辑，只保留上面的简化版本。

---

### 步骤 6：在 `start()` 方法结束后添加新的 `handleSingleLine` 方法

在 `start()` 方法的 `}` 之后，添加以下新方法：

```typescript
/**
 * 处理单行输入
 */
private async handleSingleLine(input: string): Promise<void> {
  // Windows 终端会重复显示输入，主动清除并重新显示一次
  if (process.platform === 'win32' && input && process.stdout.isTTY) {
    process.stdout.write(
      this.ANSI_MOVE_UP + this.ANSI_CLEAR_LINE + this.ANSI_CARRIAGE_RETURN
    );
    console.log(chalk.cyan("你: ") + input);
  }
  
  // 多行输入模式处理
  if (this.isMultiLineMode) {
    // 检查是否超过最大行数限制
    if (this.multiLineBuffer.length >= this.MAX_MULTILINE_LINES) {
      console.log(chalk.yellow(`\n⚠️  多行输入已达到最大限制 (${this.MAX_MULTILINE_LINES} 行)`));
      console.log(chalk.gray("自动提交当前内容...\n"));
      
      this.multiLineBuffer.push(input);
      const fullInput = this.multiLineBuffer.join('\n');
      this.isMultiLineMode = false;
      this.multiLineBuffer = [];
      this.rl.setPrompt(chalk.cyan("\n你: "));
      
      if (fullInput.trim()) {
        await this.processMultiLineInput(fullInput);
      }
      this.rl.prompt();
      return;
    }
    
    // 检查当前行是否以 \ 结尾（续行）
    if (input.endsWith('\\')) {
      this.multiLineBuffer.push(input.slice(0, -1));
      this.rl.setPrompt(chalk.gray("... "));
      this.rl.prompt();
      return;
    } else {
      // 没有 \，这是最后一行
      this.multiLineBuffer.push(input);
      const fullInput = this.multiLineBuffer.join('\n');
      this.isMultiLineMode = false;
      this.multiLineBuffer = [];
      this.rl.setPrompt(chalk.cyan("\n你: "));
      
      if (fullInput.trim()) {
        await this.processMultiLineInput(fullInput);
      }
      this.rl.prompt();
      return;
    }
  }
  
  // 单行模式
  const trimmed = input.trim();

  if (!trimmed) {
    this.rl.prompt();
    return;
  }
  
  // 检查行尾是否有续行符 \
  if (input.endsWith('\\')) {
    this.isMultiLineMode = true;
    this.multiLineBuffer = [input.slice(0, -1)];
    this.rl.setPrompt(chalk.gray("... "));
    this.rl.prompt();
    return;
  }

  // 保存到历史记录
  this.historyManager.add(trimmed);

  // 暂停 readline
  this.rl.pause();

  // 特殊命令
  if (trimmed === "exit" || trimmed === "quit") {
    console.log(chalk.gray("再見！"));
    this.rl.close();
    process.exit(0);
  }

  if (trimmed === "clear") {
    this.messages = [this.messages[0]];
    this.sessionStats.messagesCount = 0;
    console.log(chalk.green("✓ 對話歷史已清空"));
    this.rl.resume();
    this.rl.prompt();
    return;
  }

  // 处理斜线命令
  if (trimmed.startsWith("/")) {
    const handled = await handleSlashCommand(trimmed, {
      addFile: this.addFile.bind(this),
      removeFile: this.removeFile.bind(this),
      clearFiles: this.clearFiles.bind(this),
      getActiveFiles: this.getActiveFiles.bind(this),
      sessionManager: this.sessionManager,
      saveCurrentSession: this.saveCurrentSession.bind(this),
      loadSession: this.loadSession.bind(this),
      listSessions: this.listSessions.bind(this),
      deleteSession: this.deleteSession.bind(this),
    });

    if (handled) {
      this.rl.resume();
      this.rl.prompt();
      return;
    }
  }

  // 将用户消息加入历史
  this.messages.push({
    role: "user",
    content: trimmed,
  });
  this.sessionStats.messagesCount++;

  // 记录开始时间
  const startTime = Date.now();

  // 使用 orchestrator 处理
  const result = await this.orchestrator.run(this.messages, true);

  // 更新统计信息
  const responseTime = Date.now() - startTime;
  this.sessionStats.lastRequestTime = responseTime;
  this.sessionStats.totalResponseTime += responseTime;
  this.sessionStats.apiCallsCount++;

  // 估算 token 使用（简单估算）
  const inputTokens = Math.ceil(trimmed.length / 4);
  const outputTokens = result?.response ? Math.ceil(result.response.length / 4) : 0;
  this.sessionStats.totalTokensUsed += (inputTokens + outputTokens);

  if (result?.success) {
    // 输出已由 orchestrator 处理
  }

  // 恢復 readline
  this.rl.resume();
  this.rl.prompt();
}
```

---

## 完成！

完成上述所有步骤后：

1. 运行 `npm run build` 编译
2. 测试多行粘贴功能

## 测试方法

1. 启动 CLI：`npm start`
2. 复制多行文本并粘贴
3. 应该看到类似这样的提示：
   ```
   📋 检测到粘贴内容:
     • 总行数: 3
     • 字符数: 45
   
   预览:
     1. 第一行内容
     2. 第二行内容
     3. 第三行内容
   ```
