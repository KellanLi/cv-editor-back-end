#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('❌ 请输入迁移名称，例如: pnpm db:migrate add_content_info_order');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'dev', '--name', name],
  { cwd: root, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
