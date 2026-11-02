import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function readPersistedUiState<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Error loading UI state "${key}" from localStorage:`, error);
    return fallback;
  }
}

export function usePersistedUiState<T>(
  key: string,
  initialValue: T | (() => T),
  validate?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const fallback = typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
    const saved = readPersistedUiState<unknown>(key, fallback);
    return validate && !validate(saved) ? fallback : saved as T;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving UI state "${key}" to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}
