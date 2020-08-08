import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './FaceBox.css';
import { isEventInside } from './utils';

function FaceBox({ isWorried, hasExploded, isSuccess,
                   restartBoard, setShowConfig }) {

  const [ isClicking, setIsClicking ] = useState(false);
  const [ isInside, setIsInside ] = useState(false);

  function getPosX() {
    if (isClicking && isInside) return '-200px';
    if (isWorried) return '-50px';
    if (hasExploded) return '-100px';
    if (isSuccess) return '-150px';
    return '0px';
  }

  function pointerDown(e) {
    if (e.buttons !== 1) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setIsClicking(true);
    setIsInside(true);
  }

  function pointerUp(e) {
    if (isClicking) {
      e.preventDefault();
      e.target.releasePointerCapture(e.pointerId);
      if (isInside) {
        if (hasExploded || isSuccess)
          restartBoard();
        else
          setShowConfig(true);
      }
      setIsClicking(false);
      setIsInside(false);
    }
  }

  function pointerMove(e) {
    if (isClicking) {
      e.preventDefault();
      setIsInside(isEventInside(e, e.target));
    }
  }

  return (<div className='FaceBox'
               style={{backgroundPositionX: getPosX()}}
               onPointerDown={pointerDown}
               onPointerUp={pointerUp}
               onPointerMove={pointerMove} />);
}

FaceBox.propTypes = {
  mfComplete: PropTypes.bool.isRequired,
  isWorried: PropTypes.bool.isRequired,
  hasExploded: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
  restartBoard: PropTypes.func.isRequired,
  setShowConfig: PropTypes.func.isRequired
};

export default FaceBox;