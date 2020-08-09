import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import './ConfigDialog.css';

function ConfigDialog({ onApply, onCancel, open, config, sizeBounds,
                      calcNumMinesBounds, validateSize, validateNumMines,
                      version }) {
  const [ size, setSize ] = useState(config.size);
  const [ numMines, setNumMines ] = useState(config.numMines);
  const [ isLogic, setIsLogic ] = useState(config.isLogic);
  const [ hasNoFiftyFifty, setHasNoFiftyFifty ] =
      useState(config.hasNoFiftyFifty);
  const [ revealCorners, setRevealCorners ] = useState(config.revealCorners);

  useEffect(() => {
    if (open) {
      setSize(config.size);
      setNumMines(config.numMines);
      setIsLogic(config.isLogic);
      setHasNoFiftyFifty(config.hasNoFiftyFifty);
      setRevealCorners(config.revealCorners);
    }
  }, [open, setSize, setNumMines, setIsLogic, setHasNoFiftyFifty,
      setRevealCorners, config]);

  const sizeText = useCallback(() => {
    return size.x + ' x ' + size.y;
  }, [size]);
  const [ rawSize, setRawSize ] = useState(sizeText());

  useEffect(() => { setRawSize(sizeText()); }, [sizeText]);

  function selectTextOnFocus(event) {
    event.preventDefault();
    const { target } = event;
    target.focus();
    target.setSelectionRange(0, target.value.length);
  }

  function parseRawSize() {
    let val = rawSize.trim().split(/\s*[.xX:\-|,\s]\s*/);
    let error = val.length !== 2;
    error = error || !/^\s*\d+\s*$/g.test(val[0]);
    error = error || !/^\s*\d+\s*$/g.test(val[1]);
    if (error) return false;
    val = { x: Number.parseInt(val[0]), y: Number.parseInt(val[1]) };
    if (!validateSize(val)) return false;
    return val;
  }

  function validateSizeOnBlur(event) {
    const val = parseRawSize();
    if (val === false) return;
    setSize(val);
  }

  function errorInNumMines() {
    if (!/^\s*\d+\s*$/g.test(numMines)) return true;
    const val = Number.parseInt(numMines);
    return !validateNumMines(val, size);
  }

  function anyError() {
    if (parseRawSize() === false) return true;
    if (errorInNumMines()) return true;
    return false;
  }

  function handleCancel() {
    setSize({...size}); // Force-reset the raw text.
    onCancel();
  }

  function handleApply() {
    if (anyError()) {
      console.log('Error! Should not call handleApply when in error');
      return;
    }
    onApply({
      size,
      numMines: Number.parseInt(numMines),
      isLogic: isLogic,
      hasNoFiftyFifty: hasNoFiftyFifty,
      revealCorners: revealCorners
    });
  }

  function sizeErrorText() {
    if (parseRawSize() !== false) return ' ';
    return `min ${sizeBounds.min.x} x ${sizeBounds.min.y}, ` +
           `max ${sizeBounds.max.x} x ${sizeBounds.max.y}`;
  }

  function numMinesErrorText() {
    if (!errorInNumMines()) return ' ';
    const numMinesBounds = calcNumMinesBounds(size);
    return `min ${numMinesBounds.min}, max ${numMinesBounds.max}`;
  }

  return (
    <Dialog open={open}
            disableBackdropClick
            onClose={handleCancel} >
      <DialogTitle className='Unselectable'>Minesweep.IO
      <Typography className='Unselectable' variant='subtitle2'>{version}</Typography></DialogTitle>
      <div className='Form'>
        <TextField label='Size'
                   variant='filled'
                   value={rawSize}
                   onChange={e => setRawSize(e.target.value)}
                   onFocus={selectTextOnFocus}
                   onBlur={validateSizeOnBlur}
                   error={parseRawSize() === false}
                   helperText={sizeErrorText()}
                 />
        <TextField label='Number of mines'
                   variant='filled'
                   value={numMines}
                   onChange={e => setNumMines(e.target.value)}
                   onFocus={selectTextOnFocus}
                   error={errorInNumMines()}
                   helperText={numMinesErrorText()}
                 />
        <FormControlLabel className='Unselectable'
          control={<Checkbox/>}
          checked={isLogic}
          onChange={e => setIsLogic(e.target.checked)}
          label='Always logical' />
        <FormControlLabel className='Unselectable'
          control={<Checkbox/>}
          disabled={isLogic}
          checked={hasNoFiftyFifty || isLogic}
          onChange={e => setHasNoFiftyFifty(e.target.checked)}
          label='Reduce bad luck™' />
        <FormControlLabel className='Unselectable'
          control={<Checkbox/>}
          checked={revealCorners}
          onChange={e => setRevealCorners(e.target.checked)}
          label='Reveal corners' />
      </div>
      <DialogActions>
        <Button onClick={handleCancel} color='primary'>
          Cancel
        </Button>
        <Button onClick={handleApply}
                color='primary'
                disabled={anyError()}>
          Restart
        </Button>
      </DialogActions>

    </Dialog>
  );
}

ConfigDialog.propTypes = {
  onApply: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  sizeBounds: PropTypes.exact({
    min: PropTypes.exact({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    }),
    max: PropTypes.exact({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  }),
  calcNumMinesBounds: PropTypes.func.isRequired,
  validateSize: PropTypes.func.isRequired,
  validateNumMines: PropTypes.func.isRequired,
  config: PropTypes.exact({
    size: PropTypes.exact({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    numMines: PropTypes.number.isRequired,
    isLogic: PropTypes.bool.isRequired,
    hasNoFiftyFifty: PropTypes.bool.isRequired,
    revealCorners: PropTypes.bool.isRequired
  }),
  version: PropTypes.string.isRequired
};

export default ConfigDialog;