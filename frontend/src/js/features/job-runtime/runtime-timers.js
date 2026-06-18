export function stopElapsedTimer(state) {
  if (state.elapsedTimer) {
    clearInterval(state.elapsedTimer);
    state.elapsedTimer = null;
  }
}

export function startElapsedTimer(state, callback, intervalMs = 1000) {
  stopElapsedTimer(state);
  state.elapsedTimer = setInterval(callback, intervalMs);
}
