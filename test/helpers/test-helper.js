export function test({ given, when, then }, testFn) {
  return async (page) => {
    const passed = await testFn(page);
    return { passed, given, when, then };
  };
}
