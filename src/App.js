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
import FairyDialog from './FairyDialog';
import Minefield from './Minefield';
import Solver from './Solver';

const autosolve = false;
const maxSeed = 1000000;
const version = 'v 1.11';

const defaultConfig = {
  'size': {x: 9, y: 9} ,
  'numMines': 10,
  'numUndos': 0,
  'isLogic': false,
  'hasNoFiftyFifty': false,
  'revealCorners': false,
  'annoyingFairies': false,
  'manualSeed': false,
  'language': 'en'
};

const sizeBounds = { min: {x: 9, y: 9}, max: {x: 59, y: 30} }
const numMinesBoundsRaw = { min: 10, max: 0.33898 }
const maxUndos = 100;

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
         (config.numUndos >= 0 && config.numUndos <= maxUndos) &&
         typeof(config.isLogic) === 'boolean' &&
         typeof(config.hasNoFiftyFifty) === 'boolean' &&
         typeof(config.revealCorners) === 'boolean' &&
         typeof(config.annoyingFairies) === 'boolean' &&
         typeof(config.manualSeed) === 'boolean' &&
         (config.language === 'en' || config.language === 'fr');
}

const configVarName = 'config';
function getConfigFromStorage() {
  try {
    const config = JSON.parse(localStorage.getItem(configVarName));
    config.seed = calcRandomSeed();
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
  const center = {
    x: Math.floor(config.size.x/2),
    y: Math.floor(config.size.y/2),
  }
  const rng = new alea(config.seed);
  const mf = new Minefield(config.size.x, config.size.y, rng);
  const setToIgnore = new XYSet(mf.grid);
  if (config.revealCorners) {
    for (let i = 0; i < 2; ++i) {
      for (let j = 0; j < 2; ++j) {
        setToIgnore.add(0 + i, 0 + j);
        setToIgnore.add(config.size.x - 1 - i, j);
        setToIgnore.add(0 + i, config.size.y - 1 - j);
        setToIgnore.add(config.size.x - 1 - i, config.size.y - 1 - j);
      }
    }
  }
  mf.grid.forCellsInRing(center.x, center.y, 1,
      (x, y) => setToIgnore.add(x, y));
  if (config.isLogic) {
    mf.placeMinesLogically(center.x, center.y, config.numMines, setToIgnore);
  } else if (config.hasNoFiftyFifty) {
    mf.placeMinesNoBadPattern(config.numMines, setToIgnore);
  } else {
    mf.placeMinesRandomly(config.numMines, setToIgnore);
  }

  return mf
}

function calcRandomSeed() {
  return Math.floor(Math.random() * maxSeed) / maxSeed;
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
  const [ undosLeft, setUndosLeft ] = useState(null);

  // Timer state
  const [ time, resetTimer, setTimerRunning ] = useTimer(null, 1000);

  // UI state
  const [ isWorried, setIsWorried ] = useState(false);
  const [ showConfig, setShowConfig ] = useState(false);

  // Fairy dialog state
  const [ showFairyDialog, setShowFairyDialog ] = useState(false);

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
    if (!targetConfig.manualSeed)
      targetConfig.seed = calcRandomSeed();
  }, [targetConfig.manualSeed, targetConfig.seed]);

  const revealAt = useCallback((active, set) => {
    let touchedMine = false;
    active.forEach(([x, y]) => {
      if (mf.grid.getXY(x, y) === '*')
        touchedMine = [x, y];
    });
    if (touchedMine !== false) {
      // Only allow undos if there are at least 50% of flags placed.
      if (undosLeft > 0 && numFlags >= 0.5 * mf.numMines) {
          setUndosLeft(val => val - 1);
        active.forEach(([x, y]) => setStateXY(x, y, ' '));
        setStateXY(...touchedMine, '|');
        setNumFlags(f => f + 1);
        setShowFairyDialog(true);
        return;
      }
      setHasExploded(true);
    }
    while (active.length > 0) {
      const [x, y] = active.pop();
      if (getStateXY(x, y) === '.' || set.has(x, y)) continue;
      setNumRevealed(num => num + 1);
      set.add(x, y);
      setStateXY(x, y, '.');
      if (mf.grid.getXY(x, y) === 0)
        mf.grid.forEachNeighbor(x, y, (xx, yy) => active.push([xx, yy]));
    }
  }, [mf, getStateXY, setStateXY, undosLeft, numFlags]);

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
          revealAt([[0, 0]], set);
          revealAt([[mf.grid.sx - 1, 0]], set);
          revealAt([[0, mf.grid.sy - 1]], set);
          revealAt([[mf.grid.sx - 1, mf.grid.sy - 1]], set);
        }
        revealAt([[Math.floor(mf.grid.sx/2), Math.floor(mf.grid.sy/2)]], set);
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
  }, [numRevealed, mf]);

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
      setUndosLeft(targetConfig.numUndos);
      resetTimer();
    }
  }, [currentConfig, targetConfig, resetTimer]);

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
  }, [mf]);

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
                    config={targetConfig}
                    maxUndos={maxUndos}
                    maxSeed={maxSeed}
                    version={version} />
      <FairyDialog open={showFairyDialog}
                   onCancel={(explode) => { setShowFairyDialog(false); if(explode) setHasExploded(true); } }
                   language={targetConfig.language}
                   annoyingFairies={targetConfig.annoyingFairies} />
      <div className='AppSpacer' />
    </div>);
}

export default App;
