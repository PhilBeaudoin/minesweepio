import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { isEventInside } from './utils.js';
import './Grid.css';
import XYSet from './XYSet';

function isRevealable(state) {
  return state === ' ' || state === '?';
}

function containsOnlyCell(cellList, x, y) {
  return cellList.length === 1 && cellList[0][0] === x && cellList[0][1] === y;
}

function Grid({minefield:mf, mfComplete, setNumFlags, setIsWorried, hasExploded,
               isSuccess, getStateXY, setStateXY, revealAt}) {

  const [ capturedElem, setCapturedElem ] = useState(null);
  const [ isInside, setIsInside ] = useState(false);
  const [ revealedXYs, setRevealedXYs ] = useState([]);

  const cellToPosX = useCallback((x, y) => {
    const state = getStateXY(x, y);
    if (state === ' ') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-96px' : '0px';
      else if (isSuccess)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '0px';
      else
        return '0px';
    }
    if (state === 'f') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '-128px';
      else
        return '-32px';
    }
    if (state === '?') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-96px' : '-64px';
      else if (isSuccess)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '-64px';
      else
        return '-64px';
    }
    if (state === '-')
      return '-192px';
    if (state !== '.') {
      console.log('Error! User cell has undesirable value.');
      return '0px';
    }
    const val = mf.grid.getXY(x, y);
    if (val === '*')
      return '-160px';
    let digit = parseInt(val);
    if (Number.isNaN(digit) || digit < 0 || digit > 8) {
      console.log('Error! Cell has neither a mine nor a valid digit.', val);
      return '0px';
    }
    return -(192 + 32 * digit) + 'px';
  }, [mf, getStateXY, hasExploded, isSuccess]);

  const pointerDown = useCallback((x, y) => {
    return (e) => {
      e.preventDefault();
      e.target.setPointerCapture(e.pointerId);
      setCapturedElem(e.target);

      if (hasExploded || isSuccess || !mfComplete) return;

      const state = getStateXY(x, y);
      if (e.buttons === 1 && isRevealable(state)) {
        // Left button, reveal a mine if the mouse is released here.
        setIsWorried(true);
        setIsInside(true);
        setRevealedXYs([[x, y]]);
        setStateXY(x, y, '-');
      } else if (e.buttons === 2) {
        // Immediately cycle through [empty, flag, ?]
        const cycle = ' f?';
        const idx = cycle.indexOf(state);
        if (state === 'f') setNumFlags(num => num - 1);
        if (idx !== -1) setStateXY(x, y, cycle[(idx + 1)%3]);
        if (state === ' ') setNumFlags(num => num + 1);
      }
    }
  }, [hasExploded, isSuccess, getStateXY, setIsWorried, setIsInside,
      setCapturedElem, setStateXY, setNumFlags, mfComplete]);

  const pointerUp = useCallback((x, y) => {
    return (e) => {
      e.preventDefault();
      e.target.releasePointerCapture(e.pointerId);
      setCapturedElem(null);
      setIsWorried(false);

      let reveal = false;
      if (isInside) {
        if (containsOnlyCell(revealedXYs, x, y)) {
          reveal = true;
        } else {
          // Revealing cells around the current cell.
          // Do it only if flag count matches.
          let flagCount = 0;
          mf.grid.forEachNeighbor(x, y, (xx, yy) => {
            if (getStateXY(xx, yy) === 'f') flagCount++;
          });
          reveal = flagCount === mf.grid.getXY(x, y);
        }
      }
      if (reveal) {
        const set = new XYSet(mf.grid);
        revealedXYs.forEach(xy => revealAt(...xy, set));
      } else {
        revealedXYs.forEach(xy => setStateXY(...xy, ' '));
      }
      setRevealedXYs([]);
      setIsInside(false);
    }
  }, [mf, getStateXY, isInside, revealedXYs, setIsWorried, setStateXY,
      revealAt]);

  const pointerMove = useCallback((x, y) => {
    return (e) => {
      e.preventDefault();
      // Sometimes pointerDown gets eaten. Fix this by calling pointerDown
      // if we're moving with buttons down but nothing is captured.
      if (e.buttons !== 0 && capturedElem === null) pointerDown(x, y)(e);
      if (capturedElem !== e.target || hasExploded || isSuccess || !mfComplete)
        return;
      const inside = isEventInside(e, e.target);
      if (revealedXYs.length > 0) {
        setIsWorried(inside);
        // Toggle the cells that will be revealed.
        if (inside !== isInside) {
          revealedXYs.forEach(xy =>
              setStateXY(...xy, inside ? '-' : ' '));
        }
      } else {
        // If both buttons are pressed and we're on a revealed digit,
        // start revealing the cells around it.
        if (e.buttons === 3 && getStateXY(x, y) === '.' &&
            Number.isInteger(mf.grid.getXY(x, y))) {
          mf.grid.forEachNeighbor(x, y, (xx, yy) => {
            if (isRevealable(getStateXY(xx, yy))) {
              setRevealedXYs(r => {r.push([xx, yy]); return r;});
              if (inside) {
                setIsWorried(true);
                setStateXY(xx, yy, '-');
              }
            }
          });
        }
      }
      setIsInside(inside);
    }
  }, [capturedElem, getStateXY, setStateXY, hasExploded, isSuccess, mf.grid,
      pointerDown, revealedXYs, setIsWorried, isInside, mfComplete]);

  const renderCell = useCallback((y) => {
    return (state, x) => {
      return (<div key={x} className="Cell"
               style={{backgroundPositionX: cellToPosX(x, y)}}
               onPointerDown={pointerDown(x, y)}
               onPointerUp={pointerUp(x, y)}
               onPointerMove={pointerMove(x, y)}
               onContextMenu={(e) => {e.preventDefault();}}
               />);
    }
  }, [cellToPosX, pointerDown, pointerMove, pointerUp]);

  const renderRow = useCallback((row, y) => {
    return (<div key={y} className="Row">{row.map(renderCell(y))}</div>);
  }, [renderCell]);

  return (
    <div className="Grid">
      {mf.grid.rows.map(renderRow)}
    </div>
  );
}

Grid.propTypes = {
  minefield: PropTypes.object.isRequired,
  mfComplete: PropTypes.bool.isRequired,
  setNumFlags: PropTypes.func.isRequired,
  setIsWorried: PropTypes.func.isRequired,
  hasExploded: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
  getStateXY: PropTypes.func.isRequired,
  setStateXY: PropTypes.func.isRequired,
  revealAt: PropTypes.func.isRequired
};

export default Grid;
