#!/usr/bin/env node

import fs from 'fs';
import { parse } from '@typescript-eslint/typescript-estree';

export function checkPropsPattern(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // Check for default values in constructor
  if (/constructor\([^)]*=[^)]*\)/.test(content)) {
    violations.push({
      type: 'default-values',
      message: 'Constructor has default parameter values',
      severity: 'error'
    });
  }
  
  // Check for props interface if component
  if (/implements Component/.test(content) && !/interface \w+Props/.test(content)) {
    violations.push({
      type: 'missing-props-interface',
      message: 'Component missing props interface',
      severity: 'error'
    });
  }
  
  return violations;
}

export function checkMagicNumbers(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip const declarations, imports, and comments
    if (line.includes('const ') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }
    
    // Find numeric literals
    const numbers = line.match(/\b\d+(\.\d+)?\b/g);
    if (numbers && numbers.length > 0) {
      // Filter out common acceptable numbers
      const magicNumbers = numbers.filter(n => !['0', '1', '2', '-1'].includes(n));
      if (magicNumbers.length > 0) {
        violations.push({
          type: 'magic-number',
          line: i + 1,
          numbers: magicNumbers,
          message: `Magic numbers found: ${magicNumbers.join(', ')}`,
          severity: 'warning'
        });
      }
    }
  }
  
  return violations;
}

export function checkUpdateOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // Check if entity is created with components
  const hasEntityAdd = /entity\.add\(/.test(content);
  const hasUpdateOrder = /setUpdateOrder/.test(content);
  
  if (hasEntityAdd && !hasUpdateOrder) {
    violations.push({
      type: 'missing-update-order',
      message: 'Entity has components but no setUpdateOrder() call',
      severity: 'error'
    });
  }
  
  return violations;
}

export function checkReadonlyProperties(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // Simple heuristic: properties assigned in constructor but not marked readonly
  const propertyPattern = /private (\w+):/g;
  const readonlyPattern = /private readonly/;
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (propertyPattern.test(line) && !readonlyPattern.test(line)) {
      const match = line.match(/private (\w+):/);
      if (match) {
        violations.push({
          type: 'missing-readonly',
          line: i + 1,
          property: match[1],
          message: `Property '${match[1]}' could be readonly`,
          severity: 'info'
        });
      }
    }
  }
  
  return violations;
}

export function runPatternChecks(filePath) {
  const checks = {
    propsPattern: checkPropsPattern(filePath),
    magicNumbers: checkMagicNumbers(filePath),
    updateOrder: checkUpdateOrder(filePath),
    readonlyProperties: checkReadonlyProperties(filePath)
  };
  
  const allViolations = [
    ...checks.propsPattern,
    ...checks.magicNumbers,
    ...checks.updateOrder,
    ...checks.readonlyProperties
  ];
  
  return {
    passed: allViolations.filter(v => v.severity === 'error').length === 0,
    violations: allViolations
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node pattern-checker.js <file.ts>');
    process.exit(1);
  }
  
  const result = runPatternChecks(filePath);
  console.log(JSON.stringify(result, null, 2));
  
  if (!result.passed) {
    process.exit(1);
  }
}
