/**
 * Output Given-When-Then test description in a format that run-all-tests.sh can extract
 */
export function outputGWT(config) {
  console.log('[GWT-START]');
  console.log(`=== ${config.title} ===`);
  console.log(`GIVEN: ${config.given}`);
  
  if (Array.isArray(config.when)) {
    // Multiple when/then pairs
    for (let i = 0; i < config.when.length; i++) {
      console.log(`WHEN: ${config.when[i]}`);
      console.log(`THEN: ${config.then[i]}`);
    }
  } else {
    // Single when/then
    console.log(`WHEN: ${config.when}`);
    console.log(`THEN: ${config.then}`);
  }
  
  console.log('[GWT-END]');
}
