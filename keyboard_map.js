/**
 * WORD ROGUE // Two-Way QWERTY <-> JCUKEN Layout Transliteration Map
 * Allows typing Russian words while on English keyboard layout and vice versa!
 */

const KEY_MAP_EN_TO_RU = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
  '[': 'х', '{': 'х', ']': 'ъ', '}': 'ъ',
  'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д',
  ';': 'ж', ':': 'ж', '\'': 'э', '"': 'э',
  'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь',
  ',': 'б', '<': 'б', '.': 'ю', '>': 'ю', '`': 'ё', '~': 'ё'
};

const KEY_MAP_RU_TO_EN = {};
for (const [en, ru] of Object.entries(KEY_MAP_EN_TO_RU)) {
  KEY_MAP_RU_TO_EN[ru] = en;
}

window.KEY_MAP_EN_TO_RU = KEY_MAP_EN_TO_RU;
window.KEY_MAP_RU_TO_EN = KEY_MAP_RU_TO_EN;
