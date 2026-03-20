#!/usr/bin/env node

const { execSync } = require('child_process');

const name = process.argv[2];

if (!name) {
  console.error('❌ 请输入模块名称，例如: pnpm g:res user');
  process.exit(1);
}

// 统一路径
const basePath = `modules/${name}`;

try {
  console.log(`🚀 正在生成 ${name} 模块...\n`);

  execSync(`pnpm dlx @nestjs/cli g resource ${basePath}`, { stdio: 'inherit' });

  console.log(`\n✅ ${name} 模块创建完成: ${basePath}`);
} catch (error) {
  console.error('❌ 创建失败:', error.message);
}
