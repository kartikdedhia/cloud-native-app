#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Helper function to run Snyk commands
function runSnykCommand(args, options = {}) {
  try {
    const command = `snyk ${args.join(' ')}`;
    console.log(`Running: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: options.cwd || process.cwd(),
      stdio: 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      stderr: error.stderr?.toString() || '',
      stdout: error.stdout?.toString() || ''
    };
  }
}

// Check if Snyk is authenticated
function checkAuth() {
  try {
    execSync('snyk auth --check', { stdio: 'pipe' });
    console.log('✅ Snyk is authenticated');
    return true;
  } catch {
    console.log('❌ Snyk is not authenticated. Please run: snyk auth');
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const projectPath = args[1] || process.cwd();

  console.log('🔍 Snyk Security Scanner');
  console.log('========================\n');

  if (!checkAuth()) {
    process.exit(1);
  }

  switch (command) {
    case 'code':
      console.log('🔍 Scanning code for security vulnerabilities...\n');
      runSnykCommand(['code', 'test'], { cwd: projectPath });
      break;

    case 'deps':
      console.log('🔍 Scanning dependencies for vulnerabilities...\n');
      runSnykCommand(['test'], { cwd: projectPath });
      break;

    case 'container':
      const image = args[1];
      if (!image) {
        console.error('❌ Please provide a container image name');
        console.log('Usage: node snyk-scan.js container <image-name>');
        process.exit(1);
      }
      console.log(`🔍 Scanning container image: ${image}\n`);
      runSnykCommand(['container', 'test', image]);
      break;

    case 'iac':
      console.log('🔍 Scanning Infrastructure as Code files...\n');
      runSnykCommand(['iac', 'test'], { cwd: projectPath });
      break;

    case 'monitor':
      console.log('📊 Monitoring project for vulnerabilities...\n');
      runSnykCommand(['monitor'], { cwd: projectPath });
      break;

    case 'all':
      console.log('🔍 Running comprehensive security scan...\n');
      
      console.log('1. Scanning dependencies...');
      runSnykCommand(['test'], { cwd: projectPath });
      
      console.log('\n2. Scanning code...');
      runSnykCommand(['code', 'test'], { cwd: projectPath });
      
      console.log('\n3. Scanning IaC...');
      runSnykCommand(['iac', 'test'], { cwd: projectPath });
      break;

    default:
      console.log('Usage: node snyk-scan.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  code [path]     - Scan code for security vulnerabilities');
      console.log('  deps [path]     - Scan dependencies for vulnerabilities');
      console.log('  container <img> - Scan container image for vulnerabilities');
      console.log('  iac [path]      - Scan Infrastructure as Code files');
      console.log('  monitor [path]  - Monitor project for vulnerabilities');
      console.log('  all [path]      - Run all scans');
      console.log('');
      console.log('Examples:');
      console.log('  node snyk-scan.js code');
      console.log('  node snyk-scan.js deps /path/to/project');
      console.log('  node snyk-scan.js container node:18');
      console.log('  node snyk-scan.js all');
      break;
  }
}

main();
