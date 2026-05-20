function setFlag(name, value) {
  window.WorldStateManager.getInstance().setFlag(name, value);
}

function getFlag(name) {
  return window.WorldStateManager.getInstance().getFlag(name);
}

function isFlagTrue(name) {
  return window.WorldStateManager.getInstance().isFlagTrue(name);
}

function waitForFlagSync(ms = 50) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
