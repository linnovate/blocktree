#!/usr/bin/env node

/**
 * Test runner for GraphQL Armor security features
 * Run with: node test/run-armor-tests.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running GraphQL Armor Security Tests...\n');

// Run the GraphQL Armor tests
const testProcess = spawn('npx', ['mocha', 'test/core/graphql-armor.test.js'], {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
});

testProcess.on('close', (code) => {
    console.log(`\n✅ GraphQL Armor tests completed with exit code: ${code}`);
    process.exit(code);
});

testProcess.on('error', (error) => {
    console.error('❌ Error running GraphQL Armor tests:', error);
    process.exit(1);
}); 