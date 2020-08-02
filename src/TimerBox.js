import React, { useState, useEffect, useRef } from 'react';
import DigitBox from './DigitBox';

function TimerBox({ minefield, isRunning }) {

  const [ time, setTime ] = useState(0);

  useEffect(() => setTime(0), [minefield]);

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

  return (<DigitBox value={time} numDigits={4} />);
}

export default TimerBox;