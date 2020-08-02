import React, { useState, useEffect } from 'react';
import './App.css';
import TimerBox from './TimerBox';
import DigitBox from './DigitBox';
import FaceBox from './FaceBox';
import Grid from './Grid';
import { createLogicMinefield, createRandomMinefield } from './createMinefield';
import { alea } from 'seedrandom';


const seed = Math.random();
const rng = Math.random; //new alea(seed);
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

  function resetState() {
    setMf(createMf());
    setNumFlags(0);
    setHasExploded(false);
    setIsSuccess(false);
  }

  return (
    <div className='AppContainer'>
      <div className='App'>
        <div className='Top'>
          <DigitBox value={mf.numMines - mf.numFlags} numDigits={4} />
          <div className='CenterBox'>
            <FaceBox isWorried={isWorried}
                     hasExploded={hasExploded}
                     isSuccess={isSuccess}
                     resetState={resetState} />
          </div>
          <TimerBox minefield={mf} isRunning={!hasExploded && !isSuccess} />
        </div>
        <div className='Bottom'>
          <Grid minefield={mf}
                setNumFlags={setNumFlags}
                setIsWorried={setIsWorried}
                hasExploded={hasExploded}
                setHasExploded={setHasExploded}
                isSuccess={isSuccess}
                setIsSuccess={setIsSuccess} />
        </div>
      </div>
    </div>);
}

export default App;
