export function testLog(...args) {
  if (process.env.VERBOSE) {
    console.log(...args);
  }
}
