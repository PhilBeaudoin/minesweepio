import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Grid from './Grid';
import createMinefield from './createMinefield';
import { userRandom } from './utils';

const mf = createMinefield(59, 30, 30, 15, 500); //, userRandom);
//const mf = createMinefield(10, 10, 5, 5, 10);

function getPosXForDigit(val, digitPos) {
  if (val < 0) val = 0;
  if (digitPos > 1 && val < digitPos) return '0px';
  const digit = Math.floor(val / digitPos) % 10;
  return -(26 + digit * 26) + 'px';
}

function App() {

  const [ numFlags, setNumFlags ] = useState(0);
  const [ isClicking, setIsClicking ] = useState(0);
  const [ hasExploded, setHasExploded ] = useState(0);
  const [ isSuccess, setIsSuccess ] = useState(false);
  const [ stateGrid, setStateGrid ] =
      useState(' '.repeat(mf.grid.sx * mf.grid.sy));
  const [ time, setTime ] = useState(0);

  let interval = useRef(null);
  useEffect(() => {
    if (!hasExploded && !isSuccess) {
      interval.current = setInterval(() => {
        setTime(seconds => seconds + 1);
      }, 1000);
    } else if (hasExploded || isSuccess) {
      clearInterval(interval.current);
    }
    return () => clearInterval(interval.current);
  }, [hasExploded, isSuccess, time]);

  function getStateXY(x, y) {
    return stateGrid[y * mf.grid.sx + x];
  }
  function setStateXY(x, y, val) {
    setStateGrid(sg => {
      const loc = y * mf.grid.sx + x;
      return sg.substr(0, loc) + val + sg.substr(loc + 1);
    });
  }

  function getPosXForFace() {
    if (hasExploded) return '-100px';
    if (isSuccess) return '-150px';
    if (isClicking) return '-50px';
    return '0px';
  }

  return (
    <div className='App'>
      <div className='Top'>
        <div className='DigitBox'>
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 100)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 10)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 1)}} />
        </div>
        <div className='CenterBox'>
          <div className='FaceBox' style={{backgroundPositionX:
                  getPosXForFace()}} />
        </div>
        <div className='DigitBox'>
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(time, 100)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(time, 10)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(time, 1)}} />
        </div>
      </div>
      <div className='Bottom'>
        <Grid minefield={mf} setNumFlags={setNumFlags} getStateXY={getStateXY}
              setStateXY={setStateXY} setIsClicking={setIsClicking}
              hasExploded={hasExploded} setHasExploded={setHasExploded}
              isSuccess={isSuccess} setIsSuccess={setIsSuccess} />
      </div>
    </div>);
}

export default App;
