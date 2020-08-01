import React, {useState} from 'react';
import './App.css';
import Grid from './Grid';
import createMinesweeper from './MSCreator';

const ms = createMinesweeper(59, 30, 450);

function getPosXForDigit(ms, digitPos) {
  const val = ms.numMines - ms.numFlags;
  if (digitPos > 1 && val < digitPos) return 0;
  const digit = Math.floor(val / digitPos) % 10;
  return -(26 + digit * 26);
}

function App() {
  return (
    <div className='App'>
      <div className='Top'>
        <div className='DigitBox'>
          <div className='Digit'
              style={{backgroundPositionX: getPosXForDigit(ms, 100) + 'px'}} />
          <div className='Digit'
              style={{backgroundPositionX: getPosXForDigit(ms, 10) + 'px'}} />
          <div className='Digit'
              style={{backgroundPositionX: getPosXForDigit(ms, 1) + 'px'}} />
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
        <Grid minesweeper={ms} />
      </div>
    </div>);
}

export default App;
