#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

export function createRegressionSuite(featureName, testFiles) {
  const imports = testFiles.map((file, i) => 
    `import { test as test${i} } from '../tests/${featureName}/${file}';`
  ).join('\n');
  
  const tests = testFiles.map((_, i) => `test${i}`).join(', ');
  
  return `import { runTests } from '../helpers/test-runner.js';
${imports}

runTests({
  level: 'test/test-${featureName}-complete',
  commands: ['test/interactions/player.js'],
  tests: [${tests}],
  screenshotPath: 'test/screenshots/${featureName}-regression.png'
});
`;
}

export function addToRegressionSuite(featureName, testFile) {
  const suitePath = `test/regression/test-${featureName}-regression.js`;
  
  if (!fs.existsSync('test/regression')) {
    fs.mkdirSync('test/regression', { recursive: true });
  }
  
  if (!fs.existsSync(suitePath)) {
    const content = createRegressionSuite(featureName, [testFile]);
    fs.writeFileSync(suitePath, content, 'utf8');
  } else {
    // Add to existing suite
    const content = fs.readFileSync(suitePath, 'utf8');
    const lines = content.split('\n');
    
    // Find import section
    let lastImportLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import')) {
        lastImportLine = i;
      }
    }
    
    // Add import
    const importNum = (content.match(/import { test as test\d+/g) || []).length;
    const newImport = `import { test as test${importNum} } from '../tests/${featureName}/${testFile}';`;
    lines.splice(lastImportLine + 1, 0, newImport);
    
    // Add to tests array
    const testsLine = lines.findIndex(l => l.includes('tests: ['));
    if (testsLine !== -1) {
      lines[testsLine] = lines[testsLine].replace(']', `, test${importNum}]`);
    }
    
    fs.writeFileSync(suitePath, lines.join('\n'), 'utf8');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [featureName, testFile] = process.argv.slice(2);
  if (!featureName || !testFile) {
    console.error('Usage: node regression-generator.js <featureName> <testFile>');
    process.exit(1);
  }
  addToRegressionSuite(featureName, testFile);
  console.log(`✅ Added ${testFile} to regression suite`);
}
