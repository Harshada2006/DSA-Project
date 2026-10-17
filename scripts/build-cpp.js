const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'engine', 'cpp', 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log('Compiling Eco Collect C++ DSA Engine...');

const cppSrc = path.join(__dirname, '..', 'engine', 'cpp', 'src', 'main.cpp');
const testSrc = path.join(__dirname, '..', 'engine', 'cpp', 'tests', 'test_runner.cpp');
const exeOut = path.join(binDir, process.platform === 'win32' ? 'eco_engine.exe' : 'eco_engine');
const testExeOut = path.join(binDir, process.platform === 'win32' ? 'eco_engine_tests.exe' : 'eco_engine_tests');

// Try g++ first with c++1z or c++17 flag
let compiler = 'g++';
let stdFlag = '-std=c++1z';

try {
  // Test if g++ supports -std=c++17 or -std=c++1z
  try {
    execSync('g++ -std=c++17 -v', { stdio: 'pipe' });
    stdFlag = '-std=c++17';
  } catch (e) {
    stdFlag = '-std=c++1z';
  }

  console.log(`Using compiler: ${compiler} with ${stdFlag}`);
  
  const cmdMain = `${compiler} ${stdFlag} -O2 -I"${path.join(__dirname, '..', 'engine', 'cpp', 'include')}" "${cppSrc}" -o "${exeOut}"`;
  console.log(`Running: ${cmdMain}`);
  execSync(cmdMain, { stdio: 'inherit' });
  console.log(`Successfully built: ${exeOut}`);

  const cmdTest = `${compiler} ${stdFlag} -O2 -I"${path.join(__dirname, '..', 'engine', 'cpp', 'include')}" "${testSrc}" -o "${testExeOut}"`;
  console.log(`Running: ${cmdTest}`);
  execSync(cmdTest, { stdio: 'inherit' });
  console.log(`Successfully built: ${testExeOut}`);

  console.log('C++ Engine build complete.');
} catch (err) {
  console.error('Failed to compile C++ engine:', err.message);
  process.exit(1);
}
