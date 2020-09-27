import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';
import FilledInput from '@material-ui/core/FilledInput';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import Refresh from '@material-ui/icons/Refresh';
import './ConfigDialog.css';

function calcSeed(smallSeed, maxSeed) {
  const valid = smallSeed >= 0 && smallSeed < maxSeed;
  return Math.floor((valid ? smallSeed : Math.random()) * maxSeed);
}

function ConfigDialog({ onApply, onCancel, open, config, sizeBounds,
                      calcNumMinesBounds, validateSize, validateNumMines,
                      maxSeed, version }) {

  const [ size, setSize ] = useState(config.size);
  const [ numMines, setNumMines ] = useState(config.numMines);
  const [ isLogic, setIsLogic ] = useState(config.isLogic);
  const [ hasNoFiftyFifty, setHasNoFiftyFifty ] =
      useState(config.hasNoFiftyFifty);
  const [ revealCorners, setRevealCorners ] = useState(config.revealCorners);
  const [ manualSeed, setManualSeed ] = useState(config.manualSeed);
  const [ seed, setSeed ] = useState(calcSeed(config.seed, maxSeed));

  useEffect(() => {
    if (open) {
      setSize(config.size);
      setNumMines(config.numMines);
      setIsLogic(config.isLogic);
      setHasNoFiftyFifty(config.hasNoFiftyFifty);
      setRevealCorners(config.revealCorners);
      setManualSeed(config.manualSeed);
      setSeed(calcSeed(config.seed, maxSeed));
    }
  }, [open, setSize, setNumMines, setIsLogic, setHasNoFiftyFifty,
      setRevealCorners, setManualSeed, setSeed, maxSeed, config]);

  const sizeText = useCallback(() => {
    return size.x + ' x ' + size.y;
  }, [size]);
  const [ rawSize, setRawSize ] = useState(sizeText());

  useEffect(() => { setRawSize(sizeText()); }, [sizeText]);

  const selectTextOnFocus = event => {
    event.preventDefault();
    const { target } = event;
    target.focus();
    target.setSelectionRange(0, target.value.length);
  };

  const parseRawSize = () => {
    let val = rawSize.trim().split(/\s*[.xX:\-|,\s]\s*/);
    let error = val.length !== 2;
    error = error || !/^\s*\d+\s*$/g.test(val[0]);
    error = error || !/^\s*\d+\s*$/g.test(val[1]);
    if (error) return false;
    val = { x: Number.parseInt(val[0]), y: Number.parseInt(val[1]) };
    if (!validateSize(val)) return false;
    return val;
  };

  const validateSizeOnBlur = event => {
    const val = parseRawSize();
    if (val === false) return;
    setSize(val);
  };

  const errorInNumMines = () => {
    if (!/^\s*\d+\s*$/g.test(numMines)) return true;
    const val = Number.parseInt(numMines);
    return !validateNumMines(val, size);
  };

  const errorInSeed = () => {
    if (!manualSeed) return false;
    if (!/^\s*\d+\s*$/g.test(seed)) return true;
    const val = Number.parseInt(seed);
    return val < 0 || val >= maxSeed;
  };

  const anyError = () => {
    if (parseRawSize() === false) return true;
    if (errorInNumMines()) return true;
    if (errorInSeed()) return true;
    return false;
  };

  const handleCancel = () => {
    setSize({...size}); // Force-reset the raw text.
    onCancel();
  };

  const handleApply = () => {
    if (anyError()) {
      console.log('Error! Should not call handleApply when in error');
      return;
    }
    onApply({
      size,
      numMines: Number.parseInt(numMines),
      isLogic: isLogic,
      hasNoFiftyFifty: hasNoFiftyFifty,
      revealCorners: revealCorners,
      manualSeed: manualSeed,
      seed: (manualSeed ? seed : Math.floor(Math.random() * maxSeed)) / maxSeed
    });
  };

  const sizeErrorText = () => {
    if (parseRawSize() !== false) return ' ';
    return `min ${sizeBounds.min.x} x ${sizeBounds.min.y}, ` +
           `max ${sizeBounds.max.x} x ${sizeBounds.max.y}`;
  };

  const numMinesErrorText = () => {
    if (!errorInNumMines()) return ' ';
    const numMinesBounds = calcNumMinesBounds(size);
    return `min ${numMinesBounds.min}, max ${numMinesBounds.max}`;
  };

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
        <Box mt={1} className='Subform'>
          <Link href="#"
                onClick={e => {setManualSeed(!manualSeed);
                         e.preventDefault(); }}
                variant="body2">
            Set seed {manualSeed ? 'automatically' : 'manually'}
          </Link>
          {manualSeed ?
            <Box mt={1}>
              <FormControl variant='filled'>
                <InputLabel>Seed</InputLabel>
                <FilledInput
                  className='SmallWidth'
                  label='Seed'
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  onFocus={selectTextOnFocus}
                  error={errorInSeed()}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton edge='end'
                                  onClick={e => setSeed(calcSeed(-1, maxSeed))}>
                        <Refresh />
                      </IconButton>
                    </InputAdornment>
                  }
                />
                <FormHelperText>min 0, max {maxSeed - 1}</FormHelperText>
              </FormControl>
            </Box>
          : ''}
        </Box>
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
  maxSeed: PropTypes.number.isRequired,
  config: PropTypes.exact({
    size: PropTypes.exact({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    numMines: PropTypes.number.isRequired,
    isLogic: PropTypes.bool.isRequired,
    hasNoFiftyFifty: PropTypes.bool.isRequired,
    revealCorners: PropTypes.bool.isRequired,
    manualSeed: PropTypes.bool.isRequired,
    seed: PropTypes.number
  }),
  version: PropTypes.string.isRequired
};

export default ConfigDialog;