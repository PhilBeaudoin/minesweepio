import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Grid from './Grid';
import { createLogicMinefield, createRandomMinefield } from './createMinefield';
import XYSet from './XYSet';
import { isEventInside } from './utils';
import { alea } from 'seedrandom';


const seed = Math.random();
const rng = new alea(seed);
const sx = 59;
const sy = 30;
const numMines = 450;
// const sx = 10;
// const sy = 10;
// const numMines = 10;
function createMf() {
  return createRandomMinefield(sx, sy,
                               Math.floor(sx/2), Math.floor(sy/2),
                               numMines, rng);
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
  const [ numRevealed, setNumRevealed ] = useState(0);
  const [ hasExploded, setHasExploded ] = useState(false);
  const [ isSuccess, setIsSuccess ] = useState(false);
  const [ stateGrid, setStateGrid ] = useState(' '.repeat(sx * sy));
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

  useEffect(() => {
    if (numRevealed === mf.grid.sx * mf.grid.sy - mf.numMines) {
      setNumFlags(mf.numMines);
      setIsSuccess(true);
    }
  }, [numRevealed, setNumFlags, mf, setIsSuccess]);

  function resetState() {
    setMf(createMf());
    setNumFlags(0);
    setNumRevealed(0);
    setHasExploded(false);
    setIsSuccess(false);
    setStateGrid(' '.repeat(sx * sy));
    setTime(0);
  }

  const getStateXY = useCallback((x, y) => {
    return stateGrid[y * mf.grid.sx + x];
  }, [mf, stateGrid]);

  const setStateXY = useCallback((x, y, val) => {
    setStateGrid(sg => {
      const loc = y * mf.grid.sx + x;
      return sg.substr(0, loc) + val + sg.substr(loc + 1);
    });
  }, [mf]);

  const revealAt = useCallback((x, y, set) => {
    const active = [[x, y]];
    while (active.length > 0) {
      [x, y] = active.pop();
      if (getStateXY(x, y) === '.' || set.has(x, y)) continue;
      setNumRevealed(num => num + 1);
      set.add(x, y);
      setStateXY(x, y, '.');
      const val = mf.grid.getXY(x, y);
      if (val === '*')
        setHasExploded(true);
      else if (val === 0)
        mf.grid.forEachNeighbor(x, y, (xx, yy) => active.push([xx, yy]));
    }
  }, [mf, getStateXY, setStateXY]);

  useEffect(() => {
    if (numRevealed === 0) {
      const set = new XYSet(mf.grid);
      revealAt(0, 0, set);
      revealAt(mf.grid.sx - 1, 0, set);
      revealAt(0, mf.grid.sy - 1, set);
      revealAt(mf.grid.sx - 1, mf.grid.sy - 1, set);
      revealAt(Math.floor(mf.grid.sx/2), Math.floor(mf.grid.sy/2), set);
    }
  }, [numRevealed, mf, revealAt]);

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
      if (isClicking)
        resetState();
      setIsClicking(false);
      setIsClickingOnFace(false);
    }
  }

  function pointerMove(e) {
    if (isClickingOnFace) {
      e.preventDefault();
      setIsClicking(isEventInside(e, e.target));
    }
  }

  return (
    <div className='AppContainer'>
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
                isSuccess={isSuccess} setIsSuccess={setIsSuccess}
                revealAt={revealAt} />
        </div>
      </div>
    </div>);
}

export default App;
