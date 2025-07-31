#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const environment = process.argv[2]; // 'local' or 'live'

if (!environment || !['local', 'live'].includes(environment)) {
    console.error('Usage: node scripts/set-env.js <local|live>');
    process.exit(1);
}

const configPath = path.join(__dirname, '..', 'src', 'config', 'config.ts');
const sourcePath = path.join(__dirname, '..', 'src', 'config', `config.${environment}.ts`);

try {
    // Copy the appropriate config file
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(configPath, sourceContent);

    console.log(`✅ Environment set to: ${environment}`);
    console.log(`📁 Copied: ${sourcePath} -> ${configPath}`);
} catch (error) {
    console.error('❌ Error setting environment:', error.message);
    process.exit(1);
} 