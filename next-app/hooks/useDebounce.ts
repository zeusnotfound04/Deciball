import { useCallback, useEffect, useRef } from "react";

type DebounceCallback<T extends any[]> = (...args: T) => void;

function useDebounce<T extends any[]>(
  callback: DebounceCallback<T>,
  delay: number = 100
): DebounceCallback<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFunction = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return debouncedFunction;
}

export default useDebounce;
