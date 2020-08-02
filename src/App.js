import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import useTimer from './useTimer';
import DigitBox from './DigitBox';
import FaceBox from './FaceBox';
import Grid from './Grid';
import { createLogicMinefield, createRandomMinefield } from './createMinefield';
import XYSet from './XYSet';
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

function App() {

  const [ mf, setMf ] = useState(createMf());
  const [ numFlags, setNumFlags ] = useState(0);
  const [ hasExploded, setHasExploded ] = useState(false);
  const [ isSuccess, setIsSuccess ] = useState(false);
  const [ isWorried, setIsWorried ] = useState(false);

  const [ time, resetTimer, setTimerRunning ] = useTimer(false);

  useEffect(() => {
    setTimerRunning(!hasExploded && !isSuccess);
  }, [setTimerRunning, hasExploded, isSuccess]);

  const emptyState = useCallback(() => {
    return ' '.repeat(mf.grid.sx * mf.grid.sy);
  }, [mf]);

  const [ numRevealed, setNumRevealed ] = useState(0);
  const [ stateGrid, setStateGrid ] = useState(emptyState());

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
  }, [mf, getStateXY, setStateXY, setHasExploded]);

  const resetState = useCallback(() => {
    setMf(createMf());
    setNumFlags(0);
    setHasExploded(false);
    setIsSuccess(false);
    setNumRevealed(0);
    setStateGrid(emptyState());
    resetTimer();
  }, [setMf, setNumFlags, setHasExploded, setIsSuccess,
      setNumRevealed, setStateGrid, emptyState]);

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

  useEffect(() => {
    if (numRevealed === mf.grid.sx * mf.grid.sy - mf.numMines) {
      setNumFlags(mf.numMines);
      setIsSuccess(true);
    }
  }, [numRevealed, setNumFlags, mf, setIsSuccess]);

  return (
    <div className='AppContainer'>
      <div className='App'>
        <div className='Top'>
          <DigitBox value={mf.numMines - numFlags} numDigits={4} />
          <div className='CenterBox'>
            <FaceBox isWorried={isWorried}
                     hasExploded={hasExploded}
                     isSuccess={isSuccess}
                     resetState={resetState} />
          </div>
          <DigitBox value={time} numDigits={4} />
        </div>
        <div className='Bottom'>
          <Grid minefield={mf}
                setNumFlags={setNumFlags}
                setIsWorried={setIsWorried}
                hasExploded={hasExploded}
                isSuccess={isSuccess}
                getStateXY={getStateXY}
                setStateXY={setStateXY}
                revealAt={revealAt} />
        </div>
      </div>
    </div>);
}

export default App;
