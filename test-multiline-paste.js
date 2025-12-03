#!/usr/bin/env node

/**
 * 测试多行粘贴功能的脚本
 * 模拟用户粘贴大量文本的情况
 */

const { spawn } = require('child_process');
const path = require('path');

// 生成测试文本
function generateTestText(lines = 100, includeTrailingNewline = true) {
  const linesArray = [];
  for (let i = 1; i <= lines; i++) {
    linesArray.push(`这是第 ${i} 行测试文本，包含一些内容来模拟真实的用户输入。`);
  }
  const result = linesArray.join('\n');
  return includeTrailingNewline ? result + '\n' : result;
}

// 启动 CLI
function startCLI(includeTrailingNewline = true) {
  const cliPath = path.join(__dirname, 'dist', 'cli.js');
  const testText = generateTestText(3, includeTrailingNewline); // 测试3行

  console.log('启动 Bailu CLI...');
  console.log(`准备粘贴 ${testText.split('\n').length} 行文本${includeTrailingNewline ? '（带换行符）' : '（无换行符）'}\n`);

  const cli = spawn('node', [cliPath, 'chat'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'test' } // 添加测试环境变量
  });

  let outputBuffer = '';
  let isReady = false;
  let pasteDetected = false;

  cli.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    console.log('输出:', output.trim()); // 实时显示输出

    if (!isReady && output.includes('你:')) {
      isReady = true;
      console.log('CLI 已就绪，开始粘贴测试文本...');

      // 等待一秒后发送测试文本
      setTimeout(() => {
        cli.stdin.write(testText);
        console.log('测试文本已发送（无额外换行符）');
      }, 1000);
    }

    // 检查是否检测到粘贴
    if (output.includes('检测到粘贴内容') && !pasteDetected) {
      pasteDetected = true;
      console.log('✅ 成功检测到粘贴！');
    }

    // 检查是否处理完成
    if (output.includes('AI 回复') || output.includes('错误')) {
      console.log('测试完成');
      cli.kill();
    }
  });

  cli.stderr.on('data', (data) => {
    console.error('CLI 错误:', data.toString());
  });

  cli.on('close', (code) => {
    console.log(`CLI 退出，代码: ${code}`);
    console.log('测试结束');
  });

  // 超时保护
  setTimeout(() => {
    console.log('测试超时，强制结束');
    cli.kill();
  }, 30000); // 30秒超时
}

// 如果直接运行此脚本
if (require.main === module) {
  startCLI();
}

module.exports = { generateTestText, startCLI };
