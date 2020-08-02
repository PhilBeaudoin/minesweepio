import React, { useState } from 'react';
import './App.css';
import Grid from './Grid';
import createMinefield from './createMinefield';
import { userRandom } from './utils';

const mf = createMinefield(59, 30, 30, 15, 500); //, userRandom);

function getPosXForDigit(val, digitPos) {
  if (digitPos > 1 && val < digitPos) return 0;
  const digit = Math.floor(val / digitPos) % 10;
  return -(26 + digit * 26);
}

function App() {

  const [ numFlags, setNumFlags ] = useState(0);
  const [ isClicking, setIsClicking ] = useState(0);
  const [ hasExploded, setHasExploded ] = useState(0);
  const [ stateGrid, setStateGrid ] =
      useState(' '.repeat(mf.grid.sx * mf.grid.sy));

  function getStateXY(x, y) {
    return stateGrid[y * mf.grid.sx + x];
  }
  function setStateXY(x, y, val) {
    setStateGrid(sg => {
      const loc = y * mf.grid.sx + x;
      return sg.substr(0, loc) + val + sg.substr(loc + 1);
    });
  }

  return (
    <div className='App'>
      <div className='Top'>
        <div className='DigitBox'>
          <div className='Digit'
              style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 100) + 'px'}} />
          <div className='Digit'
              style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 10) + 'px'}} />
          <div className='Digit'
              style={{backgroundPositionX:
                  getPosXForDigit(mf.numMines - numFlags, 1) + 'px'}} />
        </div>
        <div className='CenterBox'>
          <div className='FaceBox'>
          </div>
        </div>
        <div className='DigitBox'>
          <div className='Digit' style={{backgroundPositionX: 0 + 'px'}} />
          <div className='Digit' style={{backgroundPositionX: 0 + 'px'}} />
          <div className='Digit' style={{backgroundPositionX: 0 + 'px'}} />
        </div>
      </div>
      <div className='Bottom'>
        <Grid minefield={mf} setNumFlags={setNumFlags} getStateXY={getStateXY}
              setStateXY={setStateXY} setIsClicking={setIsClicking}
              hasExploded={hasExploded} setHasExploded={setHasExploded} />
      </div>
    </div>);
}

export default App;
