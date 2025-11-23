#!/usr/bin/env node

/**
 * ChatOneSwap 前端部署脚本 (Node.js 版本)
 * 使用方法: node deploy.js 或 pnpm deploy
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}
// 配置信息
const config = {
  serverHost: process.env.DEPLOY_HOST || '103.30.78.171',
  serverUser: process.env.DEPLOY_USER || 'root',
  serverPort: process.env.DEPLOY_PORT || '22',
  remotePath: process.env.DEPLOY_PATH || '/www/wwwroot/swap.chatone.info',
  localDist: join(__dirname, 'dist'),
}

// 检查 dist 目录
function checkDist() {
  if (!existsSync(config.localDist)) {
    log('错误: dist 目录不存在，请先运行构建命令', 'red')
    log('运行: pnpm build 或 npm run build', 'yellow')
    process.exit(1)
  }

  const files = readdirSync(config.localDist)
  if (files.length === 0) {
    log('错误: dist 目录为空', 'red')
    process.exit(1)
  }
}

// 执行命令
function execCommand(command, description) {
  try {
    log(description, 'blue')
    execSync(command, { stdio: 'inherit', encoding: 'utf8' })
    return true
  } catch (error) {
    log(`错误: ${error.message}`, 'red')
    if (error.status === 23) {
      log('rsync 错误码 23 - 部分传输失败', 'yellow')
      log('可能原因:', 'yellow')
      log('1. 远程目录不存在或权限不足', 'yellow')
      log('2. 磁盘空间不足', 'yellow')
      log('3. 文件路径问题', 'yellow')
      log('', 'reset')
      log('尝试创建远程目录...', 'blue')
    }
    return false
  }
}

// 主函数
function main() {
  log('=== ChatOneSwap 前端部署 ===', 'green')
  log(`服务器: ${config.serverUser}@${config.serverHost}:${config.serverPort}`, 'yellow')
  log(`目标路径: ${config.remotePath}`, 'yellow')
  log('')

  // 检查 dist 目录
  checkDist()

  // 先确保远程目录存在
  log('检查并创建远程目录...', 'blue')
  const mkdirCommand = `ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost} "mkdir -p ${config.remotePath} && chmod 755 ${config.remotePath}"`
  try {
    execSync(mkdirCommand, { stdio: 'inherit', encoding: 'utf8' })
    log('✓ 远程目录已准备', 'green')
  } catch (error) {
    log(`警告: 无法创建远程目录: ${error.message}`, 'yellow')
    log('请手动创建目录或检查权限', 'yellow')
  }

  // 检查 rsync 是否可用
  try {
    execSync('which rsync', { stdio: 'ignore' })
    
    // 先测试远程目录写权限
    log('测试远程目录写权限...', 'blue')
    const testWriteCommand = `ssh -p ${config.serverPort} -o StrictHostKeyChecking=no ${config.serverUser}@${config.serverHost} "touch ${config.remotePath}/.deploy_test && rm ${config.remotePath}/.deploy_test && echo 'OK'"`
    try {
      const testResult = execSync(testWriteCommand, { encoding: 'utf8' }).trim()
      if (testResult === 'OK') {
        log('✓ 远程目录可写', 'green')
      }
    } catch (error) {
      log(`警告: 无法写入远程目录: ${error.message}`, 'yellow')
      log('尝试使用 --no-perms 选项...', 'yellow')
    }
    
    // 使用 rsync，添加更多选项来处理权限问题
    const rsyncCommand = [
      'rsync -avz --delete',
      '--no-perms',
      '--no-owner',
      '--no-group',
      "--exclude='.DS_Store'",
      "--exclude='*.map'",
      '--progress',
      `-e "ssh -p ${config.serverPort} -o StrictHostKeyChecking=no -o ConnectTimeout=10"`,
      `${config.localDist}/`,
      `${config.serverUser}@${config.serverHost}:${config.remotePath}/`,
    ].join(' ')

    log('使用 rsync 同步文件（详细模式）...', 'blue')
    try {
      execSync(rsyncCommand, { stdio: 'inherit', encoding: 'utf8' })
      log('✓ 文件同步完成', 'green')
    } catch (error) {
      log(`rsync 错误: ${error.message}`, 'red')
      if (error.status === 23) {
        log('', 'reset')
        log('rsync 部分传输失败，尝试使用 scp 作为备选方案...', 'yellow')
        log('这通常是因为某些文件权限或路径问题', 'yellow')
      }
      
      // 如果 rsync 失败，尝试 scp
      log('', 'reset')
      log('使用 scp 上传文件...', 'blue')
      const scpCommand = `scp -r -P ${config.serverPort} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${config.localDist}/* ${config.serverUser}@${config.serverHost}:${config.remotePath}/`
      try {
        execSync(scpCommand, { stdio: 'inherit', encoding: 'utf8' })
        log('✓ 文件上传完成', 'green')
      } catch (scpError) {
        log('', 'reset')
        log('部署失败，请检查:', 'red')
        log(`1. SSH 连接: ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost}`, 'yellow')
        log(`2. 目录权限: ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost} "ls -la ${config.remotePath}"`, 'yellow')
        log(`3. 磁盘空间: ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost} "df -h ${config.remotePath}"`, 'yellow')
        log(`4. 手动测试: scp -r -P ${config.serverPort} ${config.localDist}/index.html ${config.serverUser}@${config.serverHost}:${config.remotePath}/`, 'yellow')
        process.exit(1)
      }
    }
  } catch {
    // 使用 scp
    log('rsync 未安装，使用 scp 上传...', 'yellow')
    
    // 创建远程目录
    const mkdirCommand = `ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost} "mkdir -p ${config.remotePath}"`
    execCommand(mkdirCommand, '创建远程目录...')

    // 上传文件
    const scpCommand = `scp -r -P ${config.serverPort} ${config.localDist}/* ${config.serverUser}@${config.serverHost}:${config.remotePath}/`
    if (execCommand(scpCommand, '上传文件...')) {
      log('✓ 文件上传完成', 'green')
    } else {
      process.exit(1)
    }
  }

  log('', 'reset')
  log('部署成功！', 'green')
  log('访问地址: https://swap.chatone.info', 'yellow')
}

main()

