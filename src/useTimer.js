import { useState, useEffect, useRef } from 'react';

function useTimer(start) {

  const [ time, setTime ] = useState(0);
  const [ isRunning, setIsRunning ] = useState(start);

  let interval = useRef(null);
  useEffect(() => {
    if (isRunning) {
      interval.current = setInterval(() => {
        setTime(seconds => seconds + 1);
      }, 1000);
    } else if (!isRunning) {
      clearInterval(interval.current);
    }
    return () => clearInterval(interval.current);
  }, [isRunning, time]);

  return [time, () => setTime(0), setIsRunning];
}

export default useTimer;