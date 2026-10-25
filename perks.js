/**
 * WORD ROGUE // Roguelike Artifacts & Perks
 * Pick 1 of 3 upon clearing each floor or leveling up.
 */

const PERKS_POOL = [
  {
    id: 'lifesteal',
    title: 'Вампирический клинок',
    desc: 'Каждое завершенное слово восстанавливает +4 HP',
    icon: '🩸',
    apply: (hero) => { hero.lifesteal = (hero.lifesteal || 0) + 4; }
  },
  {
    id: 'crit_master',
    title: 'Меткий слог',
    desc: 'Шанс критического удара (x2.5 урона) возрастает на +25%',
    icon: '⚡',
    apply: (hero) => { hero.critChance = (hero.critChance || 0.15) + 0.25; }
  },
  {
    id: 'heavy_punch',
    title: 'Тяжелый удар',
    desc: 'Базовый урон каждого слова увеличивается на +10',
    icon: '⚔️',
    apply: (hero) => { hero.baseAtk += 10; }
  },
  {
    id: 'shield_barrier',
    title: 'Энерго-щит',
    desc: 'Поглощает 35 ед. урона на каждом новом этаже',
    icon: '🛡️',
    apply: (hero) => { hero.maxShield += 35; hero.shield = hero.maxShield; }
  },
  {
    id: 'fast_fingers',
    title: 'Спринтер печати',
    desc: 'За серию от 15 правильных букв подряд скорость атаки x2',
    icon: '🔥',
    apply: (hero) => { hero.comboBonus = true; }
  },
  {
    id: 'potion_belt',
    title: 'Пояс алхимика',
    desc: 'Дает +2 зелья лечения в инвентарь',
    icon: '🧪',
    apply: (hero) => { hero.potions += 2; }
  }
];

window.PERKS_POOL = PERKS_POOL;
