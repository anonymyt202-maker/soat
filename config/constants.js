const FONTS = {
  default: { name: 'Default', transform: (t) => t },
  bold: {
    name: 'Bold',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗',':':'꡴'};
      return map[c] || c;
    }).join('')
  },
  italic: {
    name: 'Italic',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',':':':'};
      return map[c] || c;
    }).join('')
  },
  outline: {
    name: 'Outline',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'⓪','1':'①','2':'②','3':'③','4':'④','5':'⑤','6':'⑥','7':'⑦','8':'⑧','9':'⑨',':':'꡴'};
      return map[c] || c;
    }).join('')
  },
  square: {
    name: 'Square',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'🄌','1':'🄋','2':'🄂','3':'🄃','4':'🄄','5':'🄅','6':'🄆','7':'🄇','8':'🄈','9':'🄉',':':'꡴'};
      return map[c] || c;
    }).join('')
  },
  double: {
    name: 'Double',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'𝟘','1':'𝟙','2':'𝟚','3':'𝟛','4':'𝟜','5':'𝟝','6':'𝟞','7':'𝟟','8':'𝟠','9':'𝟡',':':'꡴'};
      return map[c] || c;
    }).join('')
  },
  small: {
    name: 'Small',
    transform: (t) => t.split('').map(c => {
      const map = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',':':'꡴'};
      return map[c] || c;
    }).join('')
  },
};

const FREE_FONTS = ['default', 'bold'];
const PLUS_FONTS = ['default', 'bold', 'italic', 'outline'];
const PREMIUM_FONTS = Object.keys(FONTS);

const BIO_TYPES = {
  clock: { id: 'clock', name: '🕐 Soat' },
  birthday: { id: 'birthday', name: '🎂 Tug\'ilgan kun hisoblagichi' },
  newyear: { id: 'newyear', name: '🎉 Yangi yil hisoblagichi' },
  greeting: { id: 'greeting', name: '👋 Vaqtga qarab salomlashish' },
};

const TARIFF_NAMES = {
  free: '🔰 Free',
  standard: '⏰ Standard',
  plus: '✨ Plus',
  premium: '⭐️ Premium',
};

const TIMEZONES = {
  uz: { name: 'Uzbekistan 🇺🇿', offset: 5,   label: 'GMT+5'   },
  ru: { name: 'Russia 🇷🇺',      offset: 3,   label: 'GMT+3'   },
  us: { name: 'America 🇺🇸',     offset: -4,  label: 'GMT-4'   },
  ir: { name: 'Iran 🇮🇷',        offset: 3.5, label: 'GMT+3.5' },
  kr: { name: 'Korea 🇰🇷',       offset: 9,   label: 'GMT+9'   },
};

module.exports = { FONTS, FREE_FONTS, PLUS_FONTS, PREMIUM_FONTS, BIO_TYPES, TARIFF_NAMES, TIMEZONES };
