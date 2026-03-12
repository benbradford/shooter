#!/usr/bin/env node

import fs from 'fs';
import { componentExistenceTemplate } from './test-templates/component-existence.js';
import { rangeDetectionTemplate } from './test-templates/range-detection.js';
import { animationPlaybackTemplate } from './test-templates/animation-playback.js';
import { uiStateChangeTemplate } from './test-templates/ui-state-change.js';
import { managerQueryTemplate } from './test-templates/manager-query.js';
import { entitySpawningTemplate } from './test-templates/entity-spawning.js';

export function selectTemplate(taskName) {
  if (/Create \w+Component/i.test(taskName)) {
    return 'component-existence';
  }
  if (/detection|range/i.test(taskName)) {
    return 'range-detection';
  }
  if (/animation/i.test(taskName)) {
    return 'animation-playback';
  }
  if (/Update.*Component|UI/i.test(taskName)) {
    return 'ui-state-change';
  }
  if (/Manager/i.test(taskName)) {
    return 'manager-query';
  }
  if (/spawn|entity/i.test(taskName)) {
    return 'entity-spawning';
  }
  return 'generic';
}

export function generateTest(task, featureName, config) {
  const templateType = selectTemplate(task.name);
  
  let testContent;
  switch (templateType) {
    case 'component-existence':
      testContent = componentExistenceTemplate(config);
      break;
    case 'range-detection':
      testContent = rangeDetectionTemplate(config);
      break;
    case 'animation-playback':
      testContent = animationPlaybackTemplate(config);
      break;
    case 'ui-state-change':
      testContent = uiStateChangeTemplate(config);
      break;
    case 'manager-query':
      testContent = managerQueryTemplate(config);
      break;
    case 'entity-spawning':
      testContent = entitySpawningTemplate(config);
      break;
    default:
      return null;
  }
  
  return {
    templateType,
    content: testContent,
    filename: `test-${featureName}-${task.id.replace('.', '-')}.js`
  };
}

export function generateTestLevel(featureName, taskId, entities = []) {
  return {
    width: 20,
    height: 20,
    playerStart: { x: 5, y: 5 },
    entities,
    cells: []
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [taskName, featureName, configJson] = process.argv.slice(2);
  if (!taskName || !featureName) {
    console.error('Usage: node test-generator.js <taskName> <featureName> <configJson>');
    console.error('Example: node test-generator.js "Create NPCComponent" "npc" \'{"componentName":"NPCComponent","entityType":"npc"}\'');
    process.exit(1);
  }
  
  const config = configJson ? JSON.parse(configJson) : {};
  const task = { name: taskName, id: '1.1' };
  
  const test = generateTest(task, featureName, config);
  
  if (!test) {
    console.error('No template found for task type');
    process.exit(1);
  }
  
  // Create test directory
  const testDir = `test/tests/${featureName}`;
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Write test file
  const testPath = `${testDir}/${test.filename}`;
  fs.writeFileSync(testPath, test.content, 'utf8');
  console.log(`✅ Generated test: ${testPath}`);
  
  // Generate test level
  const level = generateTestLevel(featureName, task.id, config.entities || []);
  const levelDir = 'public/levels/test';
  if (!fs.existsSync(levelDir)) {
    fs.mkdirSync(levelDir, { recursive: true });
  }
  
  const levelPath = `${levelDir}/test-${featureName}-${task.id.replace('.', '-')}.json`;
  fs.writeFileSync(levelPath, JSON.stringify(level, null, 2), 'utf8');
  console.log(`✅ Generated level: ${levelPath}`);
  
  console.log(`\nTemplate: ${test.templateType}`);
}
