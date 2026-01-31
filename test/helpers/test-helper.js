export function test({ given, when, then }, testFn) {
  const wrappedFn = async (page) => {
    const passed = await testFn(page);
    return { passed, given, when, then };
  };
  wrappedFn.given = given;
  wrappedFn.when = when;
  wrappedFn.then = then;
  return wrappedFn;
}
