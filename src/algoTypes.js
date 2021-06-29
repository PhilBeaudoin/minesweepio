const ALGO = {
  RANDOM: 0,
  ALWAYS_LOGICAL: 1,
  REDUCE_BADLUCK: 2,
  SPACED_OUT: 3,
  MICRO_EMPTY_ZONES: 4,
  SMALL_EMPTY_ZONES: 5,
  MEDIUM_EMPTY_ZONES: 6,
  BIG_EMPTY_ZONES: 7,
  LOTS_OF_SIX: 8,
  LOTS_OF_SEVEN: 9,
  FAVOR_SMALL: 10,
  isValid: (algo) => Number.isInteger(algo) && algo >= 0 && algo <= 10
}

export default ALGO;
