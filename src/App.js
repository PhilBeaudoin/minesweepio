import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Grid from './Grid';
import { createLogicMinefield, createRandomMinefield } from './createMinefield';
import { userRandom, isEventInside } from './utils';

const sx = 59;
const sy = 30;
const numMines = 450;

// const sx = 10;
// const sy = 10;
// const numMines = 10;
function createMf() {
  return createRandomMinefield(sx, sy,
                               Math.floor(sx/2), Math.floor(sy/2),
                               numMines);
}

function getPosXForDigit(val, digitPos) {
  if (val < 0) val = 0;
  if (digitPos > 1 && val < digitPos) return '0px';
  const digit = Math.floor(val / digitPos) % 10;
  return -(26 + digit * 26) + 'px';
}

function App() {

  const [ isClicking, setIsClicking ] = useState(false);
  const [ isClickingOnFace, setIsClickingOnFace ] = useState(false);
  const [ mf, setMf ] = useState(createMf());
  const [ numFlags, setNumFlags ] = useState(0);
  const [ hasExploded, setHasExploded ] = useState(false);
  const [ isSuccess, setIsSuccess ] = useState(false);
  const [ stateGrid, setStateGrid ] = useState(' '.repeat(sx * sy));
  const [ time, setTime ] = useState(0);

  function resetState() {
    setMf(createMf());
    setNumFlags(0);
    setHasExploded(false);
    setIsSuccess(false);
    setStateGrid(' '.repeat(sx * sy));
    setTime(0);
  }

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
    if (isClicking) {
      return isClickingOnFace ? '-200px' : '-50px';
    }
    if (hasExploded) return '-100px';
    if (isSuccess) return '-150px';
    return '0px';
  }

  function pointerDown(e) {
    if (e.buttons !== 1) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setIsClicking(true);
    setIsClickingOnFace(true);
  }

  function pointerUp(e) {
    if (isClickingOnFace) {
      e.preventDefault();
      e.target.releasePointerCapture(e.pointerId);
      setIsClicking(false);
      setIsClickingOnFace(false);
      resetState();
    }
  }

  function pointerMove(e) {
    if (isClickingOnFace) {
      e.preventDefault();
      setIsClicking(isEventInside(e, e.target));
    }
  }

  return (
    <div className='App'>
      <div className='Top'>
        <div className='DigitBox'>
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 1000)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 100)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 10)}} />
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 1)}} />
        </div>
        <div className='CenterBox'>
          <div className='FaceBox' style={{backgroundPositionX:
                  getPosXForFace()}}
                 onPointerDown={pointerDown}
                 onPointerUp={pointerUp}
                 onPointerMove={pointerMove}
                />
        </div>
        <div className='DigitBox'>
          <div className='Digit' style={{backgroundPositionX:
                  getPosXForDigit(time, 1000)}} />
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
