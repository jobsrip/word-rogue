/**
 * WORD ROGUE // Clean Word Lexicon (Russian & English Support)
 * Strictly lowercase letters, NO punctuation, NO special symbols, NO spaces.
 * Categorized by length and enemy tiers.
 */

const WORD_BANK = {
  // Common fast Russian words (lower case only)
  ru: {
    tier1: [
      'удар', 'меч', 'щит', 'дым', 'яд', 'стон', 'гром', 'тень', 'мрак', 'звук',
      'свет', 'пуля', 'рана', 'взрыв', 'хват', 'крик', 'жар', 'лед', 'след', 'смерч'
    ],
    tier2: [
      'пламя', 'сталь', 'призрак', 'руны', 'шторм', 'клинок', 'ярость', 'рывок',
      'тишина', 'молния', 'броня', 'копье', 'корень', 'холод', 'искра', 'череп'
    ],
    tier3: [
      'чудовище', 'рассечение', 'сокрушение', 'детонация', 'проклятие',
      'поглощение', 'бессмертие', 'опустошение', 'уничтожение', 'воскрешение'
    ],
    boss: [
      'титаническийразлом',
      'древнеепоглощение',
      'абсолютноезабвение',
      'пепельныйапокалипсис'
    ]
  },
  // English words as fallback
  en: {
    tier1: ['dash', 'strike', 'blade', 'slash', 'void', 'fury', 'rage', 'fire', 'dark', 'pain'],
    tier2: ['shadow', 'thunder', 'phantom', 'poison', 'siphon', 'cleave', 'blight', 'silver'],
    tier3: ['annihilate', 'devastation', 'oblivion', 'execution', 'nightfall', 'overpower'],
    boss: ['chronobreaker', 'apocalypsecore', 'shadowsovereign']
  }
};

window.WORD_BANK = WORD_BANK;
