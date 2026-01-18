/**
 * Git 工具函數單元測試
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { findGitRoot, isInGitRepo, getProjectRoot, getRelativeToGitRoot } from '../../../src/utils/git.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const currentDir = path.resolve();

describe('Git 工具函數', () => {
  const testDir = path.join(currentDir, 'test-git-repo');
  const gitDir = path.join(testDir, '.git');

  beforeAll(() => {
    // 創建測試目錄結構
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(gitDir)) {
      fs.mkdirSync(gitDir, { recursive: true });
    }
  });

  it('應該在Git倉庫中找到Git根目錄', () => {
    const result = findGitRoot(testDir);
    expect(result).toBe(testDir);
  });

  it('應該返回null當不在Git倉庫中', () => {
    // 創建一個臨時目錄在系統臨時目錄中，確保不在Git倉庫中
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bailu-test-'));
    const nonGitDir = path.join(tempDir, 'non-git-dir');
    if (!fs.existsSync(nonGitDir)) {
      fs.mkdirSync(nonGitDir, { recursive: true });
    }
    const result = findGitRoot(nonGitDir);
    expect(result).toBeNull();

    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('應該正確檢查是否在Git倉庫中', () => {
    expect(isInGitRepo(testDir)).toBe(true);

    // 創建一個臨時目錄在系統臨時目錄中，確保不在Git倉庫中
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bailu-test-'));
    const nonGitDir = path.join(tempDir, 'non-git-dir');
    if (!fs.existsSync(nonGitDir)) {
      fs.mkdirSync(nonGitDir, { recursive: true });
    }
    expect(isInGitRepo(nonGitDir)).toBe(false);

    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('應該返回正確的項目根目錄', () => {
    const projectRoot = getProjectRoot(testDir);
    expect(projectRoot).toBe(testDir);

    // 創建一個臨時目錄在系統臨時目錄中，確保不在Git倉庫中
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bailu-test-'));
    const nonGitDir = path.join(tempDir, 'non-git-dir');
    if (!fs.existsSync(nonGitDir)) {
      fs.mkdirSync(nonGitDir, { recursive: true });
    }
    const nonGitRoot = getProjectRoot(nonGitDir);
    expect(nonGitRoot).toBe(nonGitDir);

    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('應該返回相對於Git根目錄的路徑', () => {
    const filePath = path.join(testDir, 'src', 'index.ts');
    const relativePath = getRelativeToGitRoot(filePath, testDir);
    expect(relativePath).toBe(path.join('src', 'index.ts'));
  });

  it('應該返回原路徑當不在Git倉庫中', () => {
    // 創建一個臨時目錄在系統臨時目錄中，確保不在Git倉庫中
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bailu-test-'));
    const nonGitDir = path.join(tempDir, 'non-git-dir');
    if (!fs.existsSync(nonGitDir)) {
      fs.mkdirSync(nonGitDir, { recursive: true });
    }
    const filePath = path.join(nonGitDir, 'file.txt');
    const result = getRelativeToGitRoot(filePath);
    expect(result).toBe(filePath);

    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
