import { useEffect, useRef } from 'react';

const handlers = new Set();

// Each mounted workspace registers its data loader, preserving local UI state.
export function useApplicationRefresh(loader) {
  const latest = useRef(loader);
  useEffect(() => { latest.current = loader; });
  useEffect(() => {
    const handler = () => latest.current();
    handlers.add(handler);
    return () => handlers.delete(handler);
  }, []);
}

export async function refreshApplication() {
  await Promise.allSettled(Array.from(handlers, handler => Promise.resolve().then(handler)));
}
