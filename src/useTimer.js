import { useState, useEffect, useRef, useCallback } from 'react';

function useTimer(start, delay) {

  const [ time, setTime ] = useState(0);
  const [ isRunning, setIsRunning ] = useState(start);

  let interval = useRef(null);
  useEffect(() => {
    if (isRunning) {
      interval.current = setInterval(() => {
        setTime(seconds => seconds + 1);
      }, delay);
    } else if (!isRunning) {
      clearInterval(interval.current);
    }
    return () => clearInterval(interval.current);
  }, [isRunning, time, delay]);

  const resetTimer = useCallback(() => setTime(0), [setTime]);

  return [time, resetTimer, setIsRunning];
}

export default useTimer;