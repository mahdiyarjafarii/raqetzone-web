let activeRequests = 0;
const listeners = new Set();

function notify() {
  const loading = activeRequests > 0;
  listeners.forEach((fn) => fn(loading));
}

export const loadingBus = {
  increment() {
    activeRequests++;
    notify();
  },
  decrement() {
    activeRequests = Math.max(0, activeRequests - 1);
    notify();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
