const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'engine', 'cpp', 'bin');
const testExeOut = path.join(binDir, process.platform === 'win32' ? 'eco_engine_tests.exe' : 'eco_engine_tests');

if (!fs.existsSync(testExeOut)) {
  console.log('Test executable not found, building first...');
  require('./build-cpp');
}

console.log(`Executing C++ Test Suite: ${testExeOut}`);
try {
  const output = execSync(`"${testExeOut}"`, { stdio: 'inherit' });
  console.log('C++ Unit Tests passed successfully!');
} catch (err) {
  console.error('C++ Unit Tests failed:', err.message);
  process.exit(1);
}
