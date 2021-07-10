import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Grid from '@material-ui/core/Grid';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import Checkbox from '@material-ui/core/Checkbox';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import Typography from '@material-ui/core/Typography';
import Refresh from '@material-ui/icons/Refresh';
import Autocomplete from '@material-ui/lab/Autocomplete';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

import genStrLocalizer, { locales } from './Language.js'
import './ConfigDialog.css';
import ALGO from './algoTypes.js';

function calcSeed(seed, maxSeed) {
  const valid = Number.isInteger(seed) && seed >= 0 && seed < maxSeed;
  return valid ? seed : Math.floor(Math.random() * maxSeed);
}

const selectTextOnFocus = event => {
  event.preventDefault();
  const { target } = event;
  target.focus();
  target.setSelectionRange(0, target.value.length);
};

function ConfigDialog({ onApply, onCancel, open, config, sizeBounds,
  calcNumMinesBounds, validateSize, validateNumMines,
  maxUndos, maxSeed, version }) {

  const [size, setSize] = useState(config.size);
  const [numMines, setNumMines] = useState(config.numMines);
  const [numUndos, setNumUndos] = useState(config.numUndos);
  const [algorithm, setAlgorithm] = useState(config.algorithm);
  const [revealCorners, setRevealCorners] = useState(config.revealCorners);
  const [annoyingFairies, setAnnoyingFairies] =
    useState(config.annoyingFairies);
  const [manualSeed, setManualSeed] = useState(config.manualSeed);
  const [seed, setSeed] = useState(calcSeed(config.seed, maxSeed));
  const [seedHistory, setSeedHistory] = useState(config.seedHistory);
  const [showLanguages, setShowLanguages] = useState(false);
  const [language, setLanguage] = useState(config.language);
  const [s, setS] = useState(() => { return str => str; });

  useEffect(() => {
    setS(() => { return genStrLocalizer(language) });
  }, [language]);

  useEffect(() => {
    if (open) {
      setSize(config.size);
      setNumMines(config.numMines);
      setNumUndos(config.numUndos);
      setAlgorithm(config.algorithm);
      setRevealCorners(config.revealCorners);
      setAnnoyingFairies(config.annoyingFairies);
      setManualSeed(config.manualSeed);
      setSeed(calcSeed(config.seed, maxSeed));
      setSeedHistory(config.seedHistory || []);
      setShowLanguages(false);
      setLanguage(config.language);
    }
  }, [open, maxSeed, config]);

  const sizeText = useCallback(() => {
    return size.x + ' x ' + size.y;
  }, [size]);
  const [rawSize, setRawSize] = useState(sizeText());

  useEffect(() => { setRawSize(sizeText()); }, [sizeText]);

  // Size parser and validator

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

  const sizeErrorText = () => {
    if (parseRawSize() !== false) return ' ';
    return `min ${sizeBounds.min.x} x ${sizeBounds.min.y}, ` +
      `max ${sizeBounds.max.x} x ${sizeBounds.max.y}`;
  };

  // Number of mines parser and validator

  const errorInNumMines = () => {
    if (!/^\s*\d+\s*$/g.test(numMines)) return true;
    const val = Number.parseInt(numMines);
    return !validateNumMines(val, size);
  };

  const numMinesErrorText = () => {
    if (!errorInNumMines()) return ' ';
    const numMinesBounds = calcNumMinesBounds(size);
    return `min ${numMinesBounds.min}, max ${numMinesBounds.max}`;
  };

  // Number of undos parser and validator

  const errorInNumUndos = () => {
    if (!/^\s*\d+\s*$/g.test(numUndos)) return true;
    const val = Number.parseInt(numUndos);
    return val < 0 || val > maxUndos;
  };

  const numUndosErrorText = () => {
    if (!errorInNumUndos()) return ' ';
    return `min 0, max ${maxUndos}`;
  };

  // Seed parser and validator

  const errorInSeed = () => {
    if (!manualSeed) return false;
    if (!/^\s*\d+\s*$/g.test(seed)) return true;
    const val = Number.parseInt(seed);
    return val < 0 || val >= maxSeed;
  };

  // Error checker

  const anyError = () => {
    if (parseRawSize() === false) return true;
    if (errorInNumMines()) return true;
    if (errorInNumUndos()) return true;
    if (errorInSeed()) return true;
    return false;
  };

  // Dialog action handlers

  const handleCancel = () => {
    setSize({ ...size }); // Force-reset the raw text.
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
      numUndos: Number.parseInt(numUndos),
      algorithm,
      revealCorners,
      annoyingFairies,
      manualSeed,
      seed: manualSeed ? parseInt(seed) : Math.floor(Math.random() * maxSeed),
      seedHistory,
      language
    });
  };

  // Dialog

  return (
    <Dialog open={open}
      disableBackdropClick
      fullWidth={true}
      maxWidth='sm'
      onClose={handleCancel} >
      <DialogTitle className='Unselectable' disableTypography>
        <Typography className='Unselectable' variant='h6'>
          Minesweep.IO
        </Typography>
        <Typography className='Unselectable' variant='subtitle2'>
          {version}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}>
            <TextField label={s('Size')}
              variant='filled'
              value={rawSize}
              fullWidth
              onChange={e => setRawSize(e.target.value)}
              onFocus={selectTextOnFocus}
              onBlur={validateSizeOnBlur}
              error={parseRawSize() === false}
              helperText={sizeErrorText()} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label={s('Number of mines')}
              variant='filled'
              value={numMines}
              fullWidth
              onChange={e => setNumMines(e.target.value)}
              onFocus={selectTextOnFocus}
              error={errorInNumMines()}
              helperText={numMinesErrorText()} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label={s('Number of fairies')}
              variant='filled'
              value={numUndos}
              fullWidth
              onChange={e => setNumUndos(e.target.value)}
              onFocus={selectTextOnFocus}
              error={errorInNumUndos()}
              helperText={numUndosErrorText()} />
          </Grid>
          <Grid item xs={12} sm={12}>
            <FormControl variant="filled" fullWidth>
              <InputLabel>{s('Algorithm')}</InputLabel>
              <Select
                value={algorithm}
                onChange={(e) => {setAlgorithm(e.target.value);}}>
                <MenuItem value={ALGO.RANDOM}>{s('Pure random')}</MenuItem>
                <MenuItem value={ALGO.ALWAYS_LOGICAL}>{s('Always logical')}</MenuItem>
                <MenuItem value={ALGO.REDUCE_BADLUCK}>{s('Reduce bad luck™')}</MenuItem>
                <MenuItem value={ALGO.SPACED_OUT}>{s('Well spaced out mines')}</MenuItem>
                <MenuItem value={ALGO.MICRO_EMPTY_ZONES}>{s('Micro empty zones')}</MenuItem>
                <MenuItem value={ALGO.SMALL_EMPTY_ZONES}>{s('Small empty zones')}</MenuItem>
                <MenuItem value={ALGO.MEDIUM_EMPTY_ZONES}>{s('Medium empty zones')}</MenuItem>
                <MenuItem value={ALGO.BIG_EMPTY_ZONES}>{s('Big empty zones')}</MenuItem>
                <MenuItem value={ALGO.LOTS_OF_SIX}>{s('Party of six')}</MenuItem>
                <MenuItem value={ALGO.LOTS_OF_SEVEN}>{s('Orgy of seven')}</MenuItem>
                <MenuItem value={ALGO.FAVOR_SMALL}>{s('Smaller is better')}</MenuItem>
                <MenuItem value={ALGO.SPECIAL_OF_THE_MONTH}>{s('Special of the month')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel className='Unselectable'
              control={<Checkbox />}
              checked={revealCorners}
              onChange={e => setRevealCorners(e.target.checked)}
              label={s('Reveal corners')} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel className='Unselectable'
              control={<Checkbox />}
              checked={annoyingFairies}
              onChange={e => setAnnoyingFairies(
                e.target.checked)}
              label={s('Annoying fairies')} />
          </Grid>
          <OptionalBox visible={manualSeed}
            toggle={setManualSeed}
            textWhenHidden={s('Specify a seed')}
            textWhenVisible={s('Do not specify a seed')}>
            <ManualSeedBox seed={seed}
              seedHistory={seedHistory}
              setSeed={setSeed}
              maxSeed={maxSeed}
              errorInSeed={errorInSeed}
              s={s} />
          </OptionalBox>
          <OptionalBox visible={showLanguages}
            toggle={setShowLanguages}
            textWhenHidden={s('Modify language')}
            textWhenVisible={s('Hide language selection')}>
            <LanguageBox language={language} setLanguage={setLanguage} />
          </OptionalBox>
          <Grid item xs={12}>
            <form action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              target="_blank">
              <input type="hidden" name="cmd" value="_s-xclick" />
              <input type="hidden" name="hosted_button_id"
                value="2Q5MZ5MJLN976" />
              <Link className='Unselectable'
                href="#"
                onClick={e => {
                  e.target.closest('form').submit();
                  e.preventDefault();
                }}
                variant="body2">
                {s('Donate to the fairies')}
              </Link>
            </form>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color='primary'>
          {s('Cancel')}
        </Button>
        <Button onClick={handleApply}
          color='primary'
          disabled={anyError()}>
          {s('New game')}
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
  maxUndos: PropTypes.number.isRequired,
  maxSeed: PropTypes.number.isRequired,
  config: PropTypes.exact({
    size: PropTypes.exact({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    numMines: PropTypes.number.isRequired,
    numUndos: PropTypes.number.isRequired,
    algorithm: PropTypes.number.isRequired,
    revealCorners: PropTypes.bool.isRequired,
    annoyingFairies: PropTypes.bool.isRequired,
    manualSeed: PropTypes.bool.isRequired,
    seed: PropTypes.number,
    seedHistory: PropTypes.array,
    language: PropTypes.string.isRequired
  }),
  version: PropTypes.string.isRequired
};

function OptionalBox({ visible, toggle, textWhenHidden, textWhenVisible,
  children }) {
  return (
    <>
      <Grid item xs={12}>
        <Link className='Unselectable'
          href="#"
          onClick={e => { toggle(!visible); e.preventDefault(); }}
          variant="body2">
          {visible ? textWhenVisible : textWhenHidden}
        </Link>
      </Grid>
      { visible ? children : ''}
    </>
  );
}

function historicSeedToOption(historicSeed) {
  const dateString = historicSeed.time === undefined ? '' :
    new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "numeric",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric"}).format(historicSeed.time);
  return (
    <React.Fragment>
      {historicSeed.seed}
      <span style={{color:'gray'}}>
        &nbsp;&nbsp;{historicSeed.time === undefined ? '' : `(${dateString})`}
      </span>
    </React.Fragment>
  )
}

function ManualSeedBox({ seed, seedHistory, setSeed, maxSeed, errorInSeed, s }) {
  return (
    <Grid container spacing={0}>
      <Grid item xs={12} sm={8}>
          <Autocomplete
              freeSolo
              value={{seed: `${seed}`}}
              onChange={(e, newValue) => newValue === null ? '' : setSeed(newValue.seed)}
              onInputChange={(e, newValue) => setSeed(newValue)}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              disableClearable
              options={seedHistory}
              getOptionLabel={(historicSeed) => `${historicSeed.seed}`}
              renderOption={(historicSeed) => historicSeedToOption(historicSeed)}
              renderInput={(params) =>
                <TextField {...params}
                           error={errorInSeed()}
                           label={s('Manual seed')}
                           variant="filled"
                           helperText={`min 0, max ${maxSeed - 1}`}
                           fullWidth />
              }
            />
      </Grid>
      <Grid item xs={12} sm={4} >
        <FormControl variant='filled' fullWidth>
          <Button edge='end'
            onClick={e => setSeed(calcSeed(-1, maxSeed))}
            fullWidth>
            {s("Generate a new seed")}
            <Refresh />
          </Button>
        </FormControl>
      </Grid>
    </Grid>
  );
}

function LanguageBox({ language, setLanguage }) {
  return (
    <Grid item xs={12}>
      <FormControl component="fieldset" fullWidth>
        <RadioGroup value={language}
          onChange={e => setLanguage(e.target.value)}>
          <Grid container spacing={1}>
            {Object.entries(locales).map(([key, value]) =>
              <Grid item xs={12} sm={4} key={key}>
                <FormControlLabel className='Unselectable'
                  value={key}
                  control={<Radio />}
                  label={value} />
              </Grid>
            )}
          </Grid>
        </RadioGroup>
      </FormControl>
    </Grid>
  );
}

export default ConfigDialog;
