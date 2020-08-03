import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import useTimer from './useTimer';
import DigitBox from './DigitBox';
import FaceBox from './FaceBox';
import Grid from './Grid';
import { createLogicMinefield, createRandomMinefield } from './createMinefield';
import XYSet from './XYSet';
import { alea } from 'seedrandom';
import ConfigDialog from './ConfigDialog';

const seed = Math.random();
const rng = new alea(seed);

const defaultConfig = {
  'size': {x: 9, y: 9} ,
  'numMines': 10,
  'isLogic': false
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
         typeof(config.isLogic) === 'boolean';
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

function createMinefield(config) {
  const func = config.isLogic ? createLogicMinefield : createRandomMinefield;
  return func(config.size.x, config.size.y,
              Math.floor(config.size.x/2), Math.floor(config.size.y/2),
              config.numMines, rng);
}

function App() {

  // Config state
  const [ targetConfig, setTargetConfig ] = useState(getConfigFromStorage());
  const [ currentConfig, setCurrentConfig ] = useState(null);

  // Board state
  const [ mf, setMf ] = useState(null);
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
    setTimerRunning(!hasExploded && !isSuccess && !showConfig);
  }, [setTimerRunning, hasExploded, isSuccess, showConfig]);

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

  const numMinesLeft = useCallback(() => {
    return mf ? mf.numMines - numFlags : 0;
  }, [mf, numFlags]);

  const numDigitsToUse = useCallback(() => {
    return targetConfig.size.x < 15 ? 3 : 4;
  }, [targetConfig]);

  useEffect(() => {
    if (!hasExploded && !isSuccess && !showConfig && numRevealed === 0) {
      const set = new XYSet(mf.grid);
      if (!currentConfig.isLogic) {
        revealAt(0, 0, set);
        revealAt(mf.grid.sx - 1, 0, set);
        revealAt(0, mf.grid.sy - 1, set);
        revealAt(mf.grid.sx - 1, mf.grid.sy - 1, set);
      }
      revealAt(Math.floor(mf.grid.sx/2), Math.floor(mf.grid.sy/2), set);
    }
  }, [hasExploded, isSuccess, showConfig, numRevealed, mf, revealAt,
      currentConfig]);

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
      setNumFlags(0);
      setHasExploded(false);
      setIsSuccess(false);
      setNumRevealed(0);
      setStateGrid(' '.repeat(targetConfig.size.x * targetConfig.size.y));
      resetTimer();
    }
  }, [currentConfig, setCurrentConfig, targetConfig, setMf, setNumFlags,
      setHasExploded, setIsSuccess, setNumRevealed, setStateGrid, resetTimer]);

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
      <div className='App'>
        <div className='Top'>
          <DigitBox value={numMinesLeft()} numDigits={numDigitsToUse()} />
          <div className='CenterBox'>
            <FaceBox isWorried={isWorried}
                     hasExploded={hasExploded}
                     isSuccess={isSuccess}
                     setShowConfig={setShowConfig} />
          </div>
          <DigitBox value={time} numDigits={numDigitsToUse()} />
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
      <ConfigDialog open={showConfig}
                    onApply={applyConfig}
                    onCancel={() => setShowConfig(false)}
                    sizeBounds={sizeBounds}
                    calcNumMinesBounds={calcNumMinesBounds}
                    validateSize={validateSize}
                    validateNumMines={validateNumMines}
                    config={targetConfig} />
    </div>);
}

export default App;
