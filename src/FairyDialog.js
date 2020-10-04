import React, { useCallback, cloneElement, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import DialogContent from '@material-ui/core/DialogContent';
import Dialog from '@material-ui/core/Dialog';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import Zoom from '@material-ui/core/Zoom';
import DialogActions from '@material-ui/core/DialogActions';

import useTimer from './useTimer';
import genStrLocalizer from './Language';
import finger from './finger';
import dialogs from './fairyTexts';

const useStyles = makeStyles({
  dialog: {
    background: 'linear-gradient(315deg, #120f2d, #3d74c4)',
    border: '3px #dddddd solid',
    borderRadius: '8px'
  },
  text: {
    userSelect: 'none',
    fontFamily: "'Palanquin', sans-serif",
    fontSize: '16pt',
    color: '#dddddd',
    textShadow: '2px 2px #222222'
  },
  bold: {
    fontWeight: 'bold'
  },
  linkHolder: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  finger: {
    userSelect: 'none',
    margin: '9px 15px 0 0',
    width: '35px',
    height: '23px'
  }
});

const tickInMs = 20;

function FairyDialog({ open, onCancel, language }) {
  const classes = useStyles();

  const [ s, setS ] = useState(() => genStrLocalizer(language));
  const [ posInDialog, setPosInDialog ] = useState([0, 0]);
  const [ dialogObject, setDialogObject ] = useState(undefined);
  const [ selIdx, setSelIdx ] = useState(0);
  const [ time, resetTimer, setTimerRunning ] = useTimer(false, tickInMs);

  useEffect(() => {
    setS(() => {return genStrLocalizer(language)});
  }, [language]);

  const reset = useCallback(() => {
    setSelIdx(0);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    reset();
    setPosInDialog([Math.floor(Math.random() * dialogs.length), 0]);
    setTimerRunning(open);
  }, [open, reset, setTimerRunning]);

  useEffect(() => {
    const obj = dialogs[posInDialog[0]][posInDialog[1]];
    setDialogObject(obj);
    if (obj === undefined)
      onCancel();
  }, [posInDialog, onCancel, resetTimer]);

  const advanceDialogue = useCallback((event, action) => {
    reset();
    setPosInDialog(posInDialog => {
      let targetIdx = posInDialog[1] + 1;
      if (action.end) targetIdx = posInDialog[0].length + 1;
      if (action.target) {
        dialogs[posInDialog[0]].forEach((obj, idx) => {
          if (obj.label && obj.label === action.target)
            targetIdx = idx;
        });
      }
      return [posInDialog[0], targetIdx];
    });
    if (action.donate) event.target.closest('form').submit();
  }, [reset]);

  useEffect(() => {
    if (dialogObject && dialogObject.auto &&
        time * tickInMs > dialogObject.auto.delay) {
      advanceDialogue(undefined, dialogObject.auto);
     }
  }, [time, dialogObject, advanceDialogue]);

  const getLineText = useCallback(line => {
    if (typeof(line) === 'string') return s(line);
    return s(line.text);
  }, [s]);

  const getLineBold = line => {
    if (typeof(line) === 'string') return false;
    return line.bold;
  };

  const getOptionText = useCallback(option => {
    if (typeof(option) === 'string') return s(option);
    return s(option.text);
  }, [s]);

  const getOptionAction = option => {
    if (typeof(option) === 'string') return {next: true};
    return option;
  };

  return (
    <Dialog classes={{paper: classes.dialog}}
            open={open}
            disableBackdropClick
            fullWidth={true}
            maxWidth='sm'
            onClose={onCancel}
            TransitionComponent={Zoom}>
      <DialogContent>
        <form action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              target="_blank">
          <input type="hidden" name="cmd" value="_s-xclick" />
          <input type="hidden" name="hosted_button_id" value="2Q5MZ5MJLN976" />
          <Typer typedLength={time}>
          {
            dialogObject
              ? dialogObject.lines.map((line, idx) =>
                  <TypedText key={idx}
                             text={getLineText(line)}
                             bold={getLineBold(line)} />)
              : ''
          }
          {
            dialogObject && dialogObject.opts
              ? dialogObject.opts.map((opt, idx) =>
                <TypedLink key={idx}
                           text={getOptionText(opt)}
                           onClick={
                             e => advanceDialogue(e, getOptionAction(opt))}
                           isSelected={selIdx === idx}
                           select={() => setSelIdx(idx)} />)
              : ''
          }
          </Typer>
        </form>
      </DialogContent>
      <DialogActions/>
    </Dialog>
  );
}

FairyDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired
};

function Typer({children, typedLength}) {

  const [ newChildren, setNewChildren ] = useState([]);

  const getText = useCallback((text, prevTextLength) => {
    if (typedLength <= prevTextLength) return '\xa0';
    return text.substr(0, typedLength - prevTextLength);
  }, [typedLength]);

  useEffect(() => {
    setNewChildren([]);
    let prevTextLength = 0;
    children.flat().forEach((child, idx) => {
      if (child && child.props && child.props.text) {
        const text = getText(child.props.text, prevTextLength, 3);
        setNewChildren(curr => [
          ...curr,
          cloneElement(child, {key: idx, text}),
        ]);
        prevTextLength += child.props.text.length;
      }
    });
  }, [children, getText]);

  return newChildren;
}

function TypedText({text, bold}) {
  const classes = useStyles();
  const boldClass = bold ? classes.bold : '';
  return (
    <Typography className={`${classes.text} ${boldClass}`}>
      {text}
    </Typography>
  );
}

function TypedLink({text, onClick, isSelected, select}) {
  const classes = useStyles();
  return (
    <div className={classes.linkHolder}>
      {isSelected && text.length > 1
        ? <img className={classes.finger} src={finger} alt='' />
        : <span className={classes.finger} />}
      <Link className={classes.text}
            variant='body1'
            href='#'
            onMouseOver={select}
            onClick={e => {onClick(e); e.preventDefault();}}>
        {text}
      </Link>
    </div>
  );
}

export default FairyDialog;