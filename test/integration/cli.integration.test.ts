/**
 * CLI 集成測試
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const currentDir = path.resolve();

describe('CLI 集成測試', () => {
  it('應該顯示幫助信息', async () => {
    const { stdout, stderr } = await execAsync('node dist/cli.js --help');
    expect(stderr).toBe('');
    expect(stdout).toContain('Bailu CLI');
    expect(stdout).toContain('ask');
    expect(stdout).toContain('fix');
    expect(stdout).toContain('chat');
    expect(stdout).toContain('run');
  });

  it('應該顯示版本信息', async () => {
    const { stdout, stderr } = await execAsync('node dist/cli.js --version');
    expect(stderr).toBe('');
    expect(stdout).toContain('0.2.8');
  });

  it('應該在缺少參數時顯示ask命令的用法', async () => {
    const { stdout, stderr } = await execAsync('node dist/cli.js ask');
    expect(stderr).toBe('');
    expect(stdout).toContain('請提供一個問題');
  });
});
