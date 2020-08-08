import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import useTimer from './useTimer';
import DigitBox from './DigitBox';
import FaceBox from './FaceBox';
import Grid from './Grid';
import ProgressBar from './ProgressBar';
import XYSet from './XYSet';
import { alea } from 'seedrandom';
import ConfigDialog from './ConfigDialog';
import Minefield from './Minefield';
import Solver from './Solver';

const autosolve = false;
const seed = Math.random();
const rng = new alea(seed);

const defaultConfig = {
  'size': {x: 9, y: 9} ,
  'numMines': 10,
  'isLogic': false,
  'revealCorners': false
};

const sizeBounds = { min: {x: 9, y: 9}, max: {x: 59, y: 30} }
const numMinesBoundsRaw = { min: 10, max: 0.33898 }

function calcNumMinesBounds(size) {
  return { min: numMinesBoundsRaw.min,
           max: Math.round(numMinesBoundsRaw.max * size.x * size.y)};
}

function validateSize(size) {
  return typeof(size) === 'object' &&
         Number.isInteger(size.x) && Number.isInteger(size.y) &&
         size.x >= sizeBounds.min.x && size.x <= sizeBounds.max.x &&
         size.y >= sizeBounds.min.y && size.y <= sizeBounds.max.y;
}

function validateNumMines(numMines, size) {
  if (!validateSize(size)) return false;
  const numMinesBounds = calcNumMinesBounds(size);
  return Number.isInteger(numMines) &&
         numMines >= numMinesBounds.min && numMines <= numMinesBounds.max;
}

function validateConfig(config) {
  return validateSize(config.size) &&
         validateNumMines(config.numMines, config.size) &&
         typeof(config.isLogic) === 'boolean' &&
         typeof(config.revealCorners) === 'boolean' &&
         !(config.isLogic && config.revealCorners);
}

const configVarName = 'config';
function getConfigFromStorage() {
  try {
    const config = JSON.parse(localStorage.getItem(configVarName));
    if (validateConfig(config)) return config;
  } catch(err) {}
  localStorage.clear();
  return defaultConfig;
}

function setConfigInStorage(config) {
  if (validateConfig(config))
    localStorage.setItem(configVarName, JSON.stringify(config));
}

function createRandomMinefield(config) {
  const center = {
    x: Math.floor(config.size.x/2),
    y: Math.floor(config.size.y/2),
  }
  const mf = new Minefield(config.size.x, config.size.y, rng);

  const setToIgnore = new XYSet(mf.grid);
  if (config.revealCorners) {
    setToIgnore.add(0, 0);
    setToIgnore.add(config.size.x - 1, 0);
    setToIgnore.add(0, config.size.y - 1);
    setToIgnore.add(config.size.x - 1, config.size.y - 1);
  }
  mf.grid.forCellsInRing(center.x, center.y, 1,
      (x, y) => setToIgnore.add(x, y));
  mf.placeMinesRandomly(config.numMines, setToIgnore);

  return mf;
}

function createLogicMinefield(config) {
  const center = {
    x: Math.floor(config.size.x/2),
    y: Math.floor(config.size.y/2),
  }
  if (config.revealCorners)
    console.log('Error! Cannot reveal corners in a logic minefield.');
  const mf = new Minefield(config.size.x, config.size.y, rng);
  mf.placeMinesLogically(center.x, center.y, config.numMines);
  return mf;
}

function createMinefield(config) {
  const func = config.isLogic ? createLogicMinefield : createRandomMinefield;
  return func(config);
}

function App() {

  // Config state
  const [ targetConfig, setTargetConfig ] = useState(getConfigFromStorage());
  const [ currentConfig, setCurrentConfig ] = useState(null);

  // Board state
  const [ mf, setMf ] = useState(null);
  const [ mfComplete, setMfComplete ] = useState(false);
  const [ mfCompletionPercent, setMfCompletionPercent ] = useState(0);
  const [ numFlags, setNumFlags ] = useState(null);
  const [ hasExploded, setHasExploded ] = useState(null);
  const [ isSuccess, setIsSuccess ] = useState(null);
  const [ numRevealed, setNumRevealed ] = useState(null);
  const [ stateGrid, setStateGrid ] = useState(null);

  // Timer state
  const [ time, resetTimer, setTimerRunning ] = useTimer(null);

  // UI state
  const [ isWorried, setIsWorried ] = useState(false);
  const [ showConfig, setShowConfig ] = useState(false);

  useEffect(() => {
    setTimerRunning(!hasExploded && !isSuccess && !showConfig && mfComplete);
  }, [setTimerRunning, hasExploded, isSuccess, showConfig, mfComplete]);

  const getStateXY = useCallback((x, y) => {
    return stateGrid[y * mf.grid.sx + x];
  }, [mf, stateGrid]);

  const setStateXY = useCallback((x, y, val) => {
    setStateGrid(sg => {
      const loc = y * mf.grid.sx + x;
      return sg.substr(0, loc) + val + sg.substr(loc + 1);
    });
  }, [mf]);

  const restartBoard = useCallback(() => {
    setCurrentConfig(null);
  }, [setCurrentConfig]);

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

  const numMinesLeft = useCallback(() => {
    return (mf && mfComplete) ? mf.numMines - numFlags : 0;
  }, [mf, mfComplete, numFlags]);

  const numDigitsToUse = useCallback(() => {
    return targetConfig.size.x < 15 ? 3 : 4;
  }, [targetConfig]);

  useEffect(() => {
    if (!hasExploded && !isSuccess && !showConfig && numRevealed === 0 &&
        mfComplete) {
      if (!autosolve) {
        const set = new XYSet(mf.grid);
        if (currentConfig.revealCorners) {
          revealAt(0, 0, set);
          revealAt(mf.grid.sx - 1, 0, set);
          revealAt(0, mf.grid.sy - 1, set);
          revealAt(mf.grid.sx - 1, mf.grid.sy - 1, set);
        }
        revealAt(Math.floor(mf.grid.sx/2), Math.floor(mf.grid.sy/2), set);
      } else {
        const solver =
            new Solver(mf, Math.floor(mf.grid.sx/2), Math.floor(mf.grid.sy/2));
        solver.start();
        solver.grid.forEachXYVal((x, y, val) => {
          if (val.deducted) {
            if (mf.grid.getXY(x, y) === '*') {
              setNumFlags(f => f + 1);
              setStateXY(x, y, 'f');
            } else {
              setNumRevealed(num => num + 1);
              setStateXY(x, y, '.');
            }
          }
        });
      }
    }
  }, [hasExploded, isSuccess, showConfig, numRevealed, mf, revealAt,
      currentConfig, setStateXY, mfComplete]);

  useEffect(() => {
    if (mf && numRevealed === mf.grid.sx * mf.grid.sy - mf.numMines) {
      setNumFlags(mf.numMines);
      setIsSuccess(true);
    }
  }, [numRevealed, setNumFlags, mf, setIsSuccess]);

  useEffect(() => {
    if (currentConfig !== targetConfig) {
      setCurrentConfig(targetConfig);
      setMf(createMinefield(targetConfig));
      setMfComplete(false);
      setNumFlags(0);
      setHasExploded(false);
      setIsSuccess(false);
      setNumRevealed(0);
      setStateGrid(' '.repeat(targetConfig.size.x * targetConfig.size.y));
      resetTimer();
    }
  }, [currentConfig, setCurrentConfig, targetConfig, setMf, setNumFlags,
      setHasExploded, setIsSuccess, setNumRevealed, setStateGrid, resetTimer]);

  useEffect(() => {
    if (mf) {
      setMfComplete(mf.isComplete());
      if (!mf.isComplete()) {
        const advance = () => {
          for(let i = 0; i < 10 && !mf.isComplete(); ++i)
            mf.continueBuilding();
          setMfCompletionPercent(
              mf.solver.numDeducted / (mf.grid.sx * mf.grid.sy));
          if (mf.isComplete())
            setMfComplete(true);
          else
            setTimeout(advance);
        }
        advance();
      }
    }
  }, [mf, setMfCompletionPercent]);

  const applyConfig = (config) => {
    setShowConfig(false);
    if (validateConfig(config)) {
      setConfigInStorage(config);
      setTargetConfig({...config});
    }
  };

  if (mf === null) return null;

  return (
    <div className='AppContainer'>
      <div className='AppSpacer' />
      <div className='App'>
        <div className='Top'>
          <DigitBox value={numMinesLeft()} numDigits={numDigitsToUse()} />
          <div className='CenterBox'>
            <FaceBox mfComplete={mfComplete}
                     isWorried={isWorried}
                     hasExploded={hasExploded}
                     isSuccess={isSuccess}
                     restartBoard={restartBoard}
                     setShowConfig={setShowConfig} />
          </div>
          <DigitBox value={time} numDigits={numDigitsToUse()} />
        </div>
        <div className='Bottom'>
          <Grid minefield={mf}
                mfComplete={mfComplete}
                setNumFlags={setNumFlags}
                setIsWorried={setIsWorried}
                hasExploded={hasExploded}
                isSuccess={isSuccess}
                getStateXY={getStateXY}
                setStateXY={setStateXY}
                revealAt={revealAt} />
        </div>
      </div>
      <ProgressBar open={!mfComplete}
                   percent={mfCompletionPercent} />
      <ConfigDialog open={showConfig}
                    onApply={applyConfig}
                    onCancel={() => setShowConfig(false)}
                    sizeBounds={sizeBounds}
                    calcNumMinesBounds={calcNumMinesBounds}
                    validateSize={validateSize}
                    validateNumMines={validateNumMines}
                    config={targetConfig} />
      <div className='AppSpacer' />
    </div>);
}

export default App;
