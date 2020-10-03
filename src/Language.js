// Express locales in their own language so that UI is clearer
export const locales = {
  'en': 'English',
  'fr': 'Français'
};
export const defaultLocale = 'en';

const localizations = {
  'Size': {fr: 'Taille'},
  'Number of mines': {fr: 'Nombre de mines'},
  'Always logical': {fr: 'Toujours logique'},
  'Reduce bad luck™': {fr: 'Malchance réduite™'},
  'Reveal corners': {fr: 'Révéler les coins'},
  'Specify a seed': {fr: 'Spécifier une seed'},
  'Use random seed': {fr: 'Utiliser une seed aléatoire'},
  'Show language selection': {fr: 'Montrer les langues'},
  'Hide language selection': {fr: 'Cacher les langues'},
  'Donate to the fairies': {fr: 'Faire un don aux fées'},
  'Cancel': {fr: 'Annuler'},
  'New game': {fr: 'Nouvelle partie'},
  'Manual seed': {fr: 'Seed manuelle'},
};

function genStrLocalizer(locale) {
  if (locale === defaultLocale)
    return str => str;
  if (locales[locale] === undefined) {
    console.log(`Warning! Unsupported locale '${locale}'`);
    return str => str;
  }

  return str => {
    const locs = localizations[str];
    const locStr = locs === undefined ? undefined : locs[locale];
    if (locStr === undefined) {
      console.log('Warning! Unlocalized string. Add this to localizations:')
      console.log(`  '${str}': {${locale}: '${str}'},`);
      return str;
    }
    return locStr;
  }
}

export default genStrLocalizer;

