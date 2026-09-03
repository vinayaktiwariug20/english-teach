// Vocabulary and phrase data.
//
// Hand-written content lives in this file. Anything approved through
// tools/merge.py arrives via ./generated.js and is folded in at the bottom.
// Each item: { en, hi, emoji }  |  { en, hi, swatch }  |  { en, hi, num }
// Emoji are deliberately limited to widely-supported glyphs (Emoji 13 and
// earlier) so nothing renders as tofu on Windows 10's Segoe UI Emoji.

import { EXTRA_WORDS, EXTRA_PHRASES, EXAMPLES } from './generated.js';

export const CATEGORIES = [
  { id: 'food',    en: 'Food',    hi: 'खाना',    emoji: '🍎' },
  { id: 'animals', en: 'Animals', hi: 'जानवर',   emoji: '🐘' },
  { id: 'body',    en: 'Body',    hi: 'शरीर',    emoji: '✋' },
  { id: 'home',    en: 'Home',    hi: 'घर',      emoji: '🏠' },
  { id: 'clothes', en: 'Clothes', hi: 'कपड़े',   emoji: '👕' },
  { id: 'nature',  en: 'Nature',  hi: 'प्रकृति', emoji: '🌳' },
  { id: 'people',  en: 'People',  hi: 'लोग',     emoji: '👨' },
  { id: 'travel',  en: 'Travel',  hi: 'सफ़र',    emoji: '🚌' },
  { id: 'places',  en: 'Places',  hi: 'जगहें',   emoji: '🏫' },
  { id: 'actions', en: 'Actions', hi: 'काम',     emoji: '🏃' },
  { id: 'colors',  en: 'Colors',  hi: 'रंग',     emoji: '🎨' },
  { id: 'numbers', en: 'Numbers', hi: 'गिनती',   emoji: '🔢' }
];

const BASE_WORDS = [
  // ---- food ----
  { cat: 'food', en: 'apple',     hi: 'सेब',      emoji: '🍎' },
  { cat: 'food', en: 'banana',    hi: 'केला',     emoji: '🍌' },
  { cat: 'food', en: 'mango',     hi: 'आम',       emoji: '🥭' },
  { cat: 'food', en: 'orange',    hi: 'संतरा',    emoji: '🍊' },
  { cat: 'food', en: 'grapes',    hi: 'अंगूर',    emoji: '🍇' },
  { cat: 'food', en: 'rice',      hi: 'चावल',     emoji: '🍚' },
  { cat: 'food', en: 'bread',     hi: 'ब्रेड',    emoji: '🍞' },
  { cat: 'food', en: 'milk',      hi: 'दूध',      emoji: '🥛' },
  { cat: 'food', en: 'water',     hi: 'पानी',     emoji: '💧' },
  { cat: 'food', en: 'tea',       hi: 'चाय',      emoji: '🍵' },
  { cat: 'food', en: 'egg',       hi: 'अंडा',     emoji: '🥚' },
  { cat: 'food', en: 'potato',    hi: 'आलू',      emoji: '🥔' },
  { cat: 'food', en: 'tomato',    hi: 'टमाटर',    emoji: '🍅' },
  { cat: 'food', en: 'onion',     hi: 'प्याज़',   emoji: '🧅' },
  { cat: 'food', en: 'carrot',    hi: 'गाजर',     emoji: '🥕' },
  { cat: 'food', en: 'fish',      hi: 'मछली',     emoji: '🐟' },
  { cat: 'food', en: 'salt',      hi: 'नमक',      emoji: '🧂' },
  { cat: 'food', en: 'biscuit',   hi: 'बिस्कुट',  emoji: '🍪' },
  { cat: 'food', en: 'cake',      hi: 'केक',      emoji: '🍰' },
  { cat: 'food', en: 'ice cream', hi: 'आइसक्रीम', emoji: '🍦' },
  { cat: 'food', en: 'honey',     hi: 'शहद',      emoji: '🍯' },
  { cat: 'food', en: 'corn',      hi: 'मक्का',    emoji: '🌽' },

  // ---- animals ----
  { cat: 'animals', en: 'dog',       hi: 'कुत्ता',   emoji: '🐕' },
  { cat: 'animals', en: 'cat',       hi: 'बिल्ली',   emoji: '🐈' },
  { cat: 'animals', en: 'cow',       hi: 'गाय',      emoji: '🐄' },
  { cat: 'animals', en: 'horse',     hi: 'घोड़ा',    emoji: '🐎' },
  { cat: 'animals', en: 'elephant',  hi: 'हाथी',     emoji: '🐘' },
  { cat: 'animals', en: 'monkey',    hi: 'बंदर',     emoji: '🐒' },
  { cat: 'animals', en: 'bird',      hi: 'चिड़िया',  emoji: '🐦' },
  { cat: 'animals', en: 'lion',      hi: 'शेर',      emoji: '🦁' },
  { cat: 'animals', en: 'tiger',     hi: 'बाघ',      emoji: '🐅' },
  { cat: 'animals', en: 'goat',      hi: 'बकरी',     emoji: '🐐' },
  { cat: 'animals', en: 'mouse',     hi: 'चूहा',     emoji: '🐭' },
  { cat: 'animals', en: 'snake',     hi: 'साँप',     emoji: '🐍' },
  { cat: 'animals', en: 'butterfly', hi: 'तितली',    emoji: '🦋' },
  { cat: 'animals', en: 'frog',      hi: 'मेंढक',    emoji: '🐸' },
  { cat: 'animals', en: 'rabbit',    hi: 'खरगोश',    emoji: '🐇' },
  { cat: 'animals', en: 'ant',       hi: 'चींटी',    emoji: '🐜' },
  { cat: 'animals', en: 'bee',       hi: 'मधुमक्खी', emoji: '🐝' },
  { cat: 'animals', en: 'duck',      hi: 'बत्तख',    emoji: '🦆' },
  { cat: 'animals', en: 'sheep',     hi: 'भेड़',     emoji: '🐑' },
  { cat: 'animals', en: 'hen',       hi: 'मुर्गी',   emoji: '🐔' },
  { cat: 'animals', en: 'turtle',    hi: 'कछुआ',     emoji: '🐢' },
  { cat: 'animals', en: 'camel',     hi: 'ऊँट',      emoji: '🐫' },

  // ---- body ----
  { cat: 'body', en: 'hand',   hi: 'हाथ',    emoji: '✋' },
  { cat: 'body', en: 'eye',    hi: 'आँख',    emoji: '👁️' },
  { cat: 'body', en: 'ear',    hi: 'कान',    emoji: '👂' },
  { cat: 'body', en: 'nose',   hi: 'नाक',    emoji: '👃' },
  { cat: 'body', en: 'mouth',  hi: 'मुँह',   emoji: '👄' },
  { cat: 'body', en: 'tooth',  hi: 'दाँत',   emoji: '🦷' },
  { cat: 'body', en: 'tongue', hi: 'जीभ',    emoji: '👅' },
  { cat: 'body', en: 'foot',   hi: 'पैर',    emoji: '🦶' },
  { cat: 'body', en: 'leg',    hi: 'टाँग',   emoji: '🦵' },
  { cat: 'body', en: 'finger', hi: 'उंगली',  emoji: '☝️' },
  { cat: 'body', en: 'heart',  hi: 'दिल',    emoji: '❤️' },
  { cat: 'body', en: 'brain',  hi: 'दिमाग',  emoji: '🧠' },
  { cat: 'body', en: 'bone',   hi: 'हड्डी',  emoji: '🦴' },
  { cat: 'body', en: 'arm',    hi: 'बाँह',   emoji: '💪' },

  // ---- home ----
  { cat: 'home', en: 'house',      hi: 'घर',        emoji: '🏠' },
  { cat: 'home', en: 'door',       hi: 'दरवाज़ा',   emoji: '🚪' },
  { cat: 'home', en: 'window',     hi: 'खिड़की',    emoji: '🪟' },
  { cat: 'home', en: 'bed',        hi: 'बिस्तर',    emoji: '🛏️' },
  { cat: 'home', en: 'chair',      hi: 'कुर्सी',    emoji: '🪑' },
  { cat: 'home', en: 'key',        hi: 'चाबी',      emoji: '🔑' },
  { cat: 'home', en: 'light',      hi: 'बत्ती',     emoji: '💡' },
  { cat: 'home', en: 'soap',       hi: 'साबुन',     emoji: '🧼' },
  { cat: 'home', en: 'broom',      hi: 'झाड़ू',     emoji: '🧹' },
  { cat: 'home', en: 'bucket',     hi: 'बाल्टी',    emoji: '🪣' },
  { cat: 'home', en: 'spoon',      hi: 'चम्मच',     emoji: '🥄' },
  { cat: 'home', en: 'plate',      hi: 'प्लेट',     emoji: '🍽️' },
  { cat: 'home', en: 'cup',        hi: 'कप',        emoji: '☕' },
  { cat: 'home', en: 'knife',      hi: 'चाकू',      emoji: '🔪' },
  { cat: 'home', en: 'book',       hi: 'किताब',     emoji: '📖' },
  { cat: 'home', en: 'pen',        hi: 'कलम',       emoji: '🖊️' },
  { cat: 'home', en: 'pencil',     hi: 'पेंसिल',    emoji: '✏️' },
  { cat: 'home', en: 'bag',        hi: 'बैग',       emoji: '🎒' },
  { cat: 'home', en: 'phone',      hi: 'फ़ोन',      emoji: '📱' },
  { cat: 'home', en: 'clock',      hi: 'घड़ी',      emoji: '🕐' },
  { cat: 'home', en: 'mirror',     hi: 'आईना',      emoji: '🪞' },
  { cat: 'home', en: 'toothbrush', hi: 'टूथब्रश',   emoji: '🪥' },
  { cat: 'home', en: 'scissors',   hi: 'कैंची',     emoji: '✂️' },
  { cat: 'home', en: 'umbrella',   hi: 'छाता',      emoji: '☂️' },
  { cat: 'home', en: 'ball',       hi: 'गेंद',      emoji: '⚽' },
  { cat: 'home', en: 'box',        hi: 'डिब्बा',    emoji: '📦' },
  { cat: 'home', en: 'money',      hi: 'पैसा',      emoji: '💵' },
  { cat: 'home', en: 'candle',     hi: 'मोमबत्ती',  emoji: '🕯️' },

  // ---- clothes ----
  { cat: 'clothes', en: 'shirt',   hi: 'कमीज़',    emoji: '👕' },
  { cat: 'clothes', en: 'pants',   hi: 'पैंट',     emoji: '👖' },
  { cat: 'clothes', en: 'shoes',   hi: 'जूते',     emoji: '👟' },
  { cat: 'clothes', en: 'socks',   hi: 'मोज़े',    emoji: '🧦' },
  { cat: 'clothes', en: 'cap',     hi: 'टोपी',     emoji: '🧢' },
  { cat: 'clothes', en: 'dress',   hi: 'फ़्रॉक',   emoji: '👗' },
  { cat: 'clothes', en: 'glasses', hi: 'चश्मा',    emoji: '👓' },
  { cat: 'clothes', en: 'watch',   hi: 'घड़ी',     emoji: '⌚' },
  { cat: 'clothes', en: 'coat',    hi: 'कोट',      emoji: '🧥' },
  { cat: 'clothes', en: 'gloves',  hi: 'दस्ताने',  emoji: '🧤' },
  { cat: 'clothes', en: 'ring',    hi: 'अंगूठी',   emoji: '💍' },
  { cat: 'clothes', en: 'sari',    hi: 'साड़ी',    emoji: '🥻' },

  // ---- nature ----
  { cat: 'nature', en: 'sun',      hi: 'सूरज',    emoji: '☀️' },
  { cat: 'nature', en: 'moon',     hi: 'चाँद',    emoji: '🌙' },
  { cat: 'nature', en: 'star',     hi: 'तारा',    emoji: '⭐' },
  { cat: 'nature', en: 'tree',     hi: 'पेड़',    emoji: '🌳' },
  { cat: 'nature', en: 'flower',   hi: 'फूल',     emoji: '🌸' },
  { cat: 'nature', en: 'leaf',     hi: 'पत्ता',   emoji: '🍃' },
  { cat: 'nature', en: 'rain',     hi: 'बारिश',   emoji: '🌧️' },
  { cat: 'nature', en: 'cloud',    hi: 'बादल',    emoji: '☁️' },
  { cat: 'nature', en: 'fire',     hi: 'आग',      emoji: '🔥' },
  { cat: 'nature', en: 'mountain', hi: 'पहाड़',   emoji: '⛰️' },
  { cat: 'nature', en: 'river',    hi: 'नदी',     emoji: '🏞️' },
  { cat: 'nature', en: 'sea',      hi: 'समुंदर',  emoji: '🌊' },
  { cat: 'nature', en: 'snow',     hi: 'बर्फ़',   emoji: '❄️' },
  { cat: 'nature', en: 'earth',    hi: 'धरती',    emoji: '🌍' },

  // ---- people ----
  { cat: 'people', en: 'mother',  hi: 'माँ',      emoji: '👩' },
  { cat: 'people', en: 'father',  hi: 'पिता',     emoji: '👨' },
  { cat: 'people', en: 'boy',     hi: 'लड़का',    emoji: '👦' },
  { cat: 'people', en: 'girl',    hi: 'लड़की',    emoji: '👧' },
  { cat: 'people', en: 'baby',    hi: 'बच्चा',    emoji: '👶' },
  { cat: 'people', en: 'doctor',  hi: 'डॉक्टर',   emoji: '🩺' },
  { cat: 'people', en: 'teacher', hi: 'शिक्षक',   emoji: '👩‍🏫' },
  { cat: 'people', en: 'police',  hi: 'पुलिस',    emoji: '👮' },
  { cat: 'people', en: 'farmer',  hi: 'किसान',    emoji: '👨‍🌾' },
  { cat: 'people', en: 'cook',    hi: 'रसोइया',   emoji: '👨‍🍳' },
  { cat: 'people', en: 'family',  hi: 'परिवार',   emoji: '👪' },
  { cat: 'people', en: 'friend',  hi: 'दोस्त',    emoji: '🤝' },

  // ---- travel ----
  { cat: 'travel', en: 'car',        hi: 'गाड़ी',      emoji: '🚗' },
  { cat: 'travel', en: 'bus',        hi: 'बस',         emoji: '🚌' },
  { cat: 'travel', en: 'train',      hi: 'रेलगाड़ी',   emoji: '🚆' },
  { cat: 'travel', en: 'bicycle',    hi: 'साइकिल',     emoji: '🚲' },
  { cat: 'travel', en: 'motorcycle', hi: 'मोटरसाइकिल', emoji: '🏍️' },
  { cat: 'travel', en: 'aeroplane',  hi: 'हवाई जहाज़', emoji: '✈️' },
  { cat: 'travel', en: 'boat',       hi: 'नाव',        emoji: '⛵' },
  { cat: 'travel', en: 'truck',      hi: 'ट्रक',       emoji: '🚚' },
  { cat: 'travel', en: 'rickshaw',   hi: 'रिक्शा',     emoji: '🛺' },
  { cat: 'travel', en: 'ambulance',  hi: 'एम्बुलेंस',  emoji: '🚑' },
  { cat: 'travel', en: 'road',       hi: 'सड़क',       emoji: '🛣️' },
  { cat: 'travel', en: 'bridge',     hi: 'पुल',        emoji: '🌉' },

  // ---- places ----
  { cat: 'places', en: 'school',   hi: 'स्कूल',    emoji: '🏫' },
  { cat: 'places', en: 'market',   hi: 'बाज़ार',   emoji: '🛒' },
  { cat: 'places', en: 'shop',     hi: 'दुकान',    emoji: '🏪' },
  { cat: 'places', en: 'hospital', hi: 'अस्पताल',  emoji: '🏥' },
  { cat: 'places', en: 'temple',   hi: 'मंदिर',    emoji: '🛕' },
  { cat: 'places', en: 'park',     hi: 'पार्क',    emoji: '⛲' },
  { cat: 'places', en: 'station',  hi: 'स्टेशन',   emoji: '🚉' },
  { cat: 'places', en: 'office',   hi: 'दफ़्तर',   emoji: '🏢' },

  // ---- actions ----
  { cat: 'actions', en: 'eat',    hi: 'खाना',       emoji: '🍽️' },
  { cat: 'actions', en: 'drink',  hi: 'पीना',       emoji: '🥤' },
  { cat: 'actions', en: 'sleep',  hi: 'सोना',       emoji: '😴' },
  { cat: 'actions', en: 'run',    hi: 'दौड़ना',     emoji: '🏃' },
  { cat: 'actions', en: 'walk',   hi: 'चलना',       emoji: '🚶' },
  { cat: 'actions', en: 'jump',   hi: 'कूदना',      emoji: '🤸' },
  { cat: 'actions', en: 'write',  hi: 'लिखना',      emoji: '✍️' },
  { cat: 'actions', en: 'laugh',  hi: 'हँसना',      emoji: '😄' },
  { cat: 'actions', en: 'cry',    hi: 'रोना',       emoji: '😢' },
  { cat: 'actions', en: 'sing',   hi: 'गाना',       emoji: '🎤' },
  { cat: 'actions', en: 'dance',  hi: 'नाचना',      emoji: '💃' },
  { cat: 'actions', en: 'swim',   hi: 'तैरना',      emoji: '🏊' },
  { cat: 'actions', en: 'think',  hi: 'सोचना',      emoji: '🤔' },
  { cat: 'actions', en: 'listen', hi: 'सुनना',      emoji: '👂' },
  { cat: 'actions', en: 'clap',   hi: 'ताली बजाना', emoji: '👏' },
  { cat: 'actions', en: 'wave',   hi: 'हाथ हिलाना', emoji: '👋' },

  // ---- colors (rendered as swatches, not emoji) ----
  { cat: 'colors', en: 'red',    hi: 'लाल',    swatch: '#e23b3b' },
  { cat: 'colors', en: 'blue',   hi: 'नीला',   swatch: '#2f6fdc' },
  { cat: 'colors', en: 'green',  hi: 'हरा',    swatch: '#2fa84f' },
  { cat: 'colors', en: 'yellow', hi: 'पीला',   swatch: '#f2c521' },
  { cat: 'colors', en: 'black',  hi: 'काला',   swatch: '#242424' },
  { cat: 'colors', en: 'white',  hi: 'सफ़ेद',  swatch: '#ffffff' },
  { cat: 'colors', en: 'orange', hi: 'नारंगी', swatch: '#f07d23' },
  { cat: 'colors', en: 'purple', hi: 'बैंगनी', swatch: '#8a4fd3' },
  { cat: 'colors', en: 'brown',  hi: 'भूरा',   swatch: '#8a5a2b' },
  { cat: 'colors', en: 'pink',   hi: 'गुलाबी', swatch: '#f07ba8' },
  { cat: 'colors', en: 'grey',   hi: 'सलेटी',  swatch: '#8f9296' },

  // ---- numbers (rendered as digits) ----
  { cat: 'numbers', en: 'one',   hi: 'एक',   num: '1' },
  { cat: 'numbers', en: 'two',   hi: 'दो',   num: '2' },
  { cat: 'numbers', en: 'three', hi: 'तीन',  num: '3' },
  { cat: 'numbers', en: 'four',  hi: 'चार',  num: '4' },
  { cat: 'numbers', en: 'five',  hi: 'पाँच', num: '5' },
  { cat: 'numbers', en: 'six',   hi: 'छह',   num: '6' },
  { cat: 'numbers', en: 'seven', hi: 'सात',  num: '7' },
  { cat: 'numbers', en: 'eight', hi: 'आठ',   num: '8' },
  { cat: 'numbers', en: 'nine',  hi: 'नौ',   num: '9' },
  { cat: 'numbers', en: 'ten',   hi: 'दस',   num: '10' }
];

const BASE_PHRASES = [
  { en: 'Hello.',               hi: 'नमस्ते।',                  emoji: '👋' },
  { en: 'Good morning.',        hi: 'सुप्रभात।',                emoji: '🌅' },
  { en: 'Good night.',          hi: 'शुभ रात्रि।',              emoji: '🌙' },
  { en: 'How are you?',         hi: 'आप कैसे हैं?',             emoji: '🙂' },
  { en: 'I am fine.',           hi: 'मैं ठीक हूँ।',             emoji: '👍' },
  { en: 'Thank you.',           hi: 'धन्यवाद।',                 emoji: '🙏' },
  { en: 'Please.',              hi: 'कृपया।',                   emoji: '🤲' },
  { en: 'Sorry.',               hi: 'माफ़ कीजिए।',              emoji: '😔' },
  { en: 'Yes.',                 hi: 'हाँ।',                     emoji: '✅' },
  { en: 'No.',                  hi: 'नहीं।',                    emoji: '❌' },
  { en: 'I want water.',        hi: 'मुझे पानी चाहिए।',         emoji: '💧' },
  { en: 'I am hungry.',         hi: 'मुझे भूख लगी है।',         emoji: '🍽️' },
  { en: 'I want to eat.',       hi: 'मुझे खाना है।',            emoji: '🍛' },
  { en: 'I need help.',         hi: 'मुझे मदद चाहिए।',          emoji: '🙋' },
  { en: 'Can you help me?',     hi: 'क्या आप मेरी मदद करेंगे?', emoji: '👐' },
  { en: 'Where is the toilet?', hi: 'शौचालय कहाँ है?',          emoji: '🚻' },
  { en: 'I want to go home.',   hi: 'मुझे घर जाना है।',         emoji: '🏠' },
  { en: 'I am tired.',          hi: 'मैं थक गया हूँ।',          emoji: '😪' },
  { en: 'I am not well.',       hi: 'मेरी तबीयत ठीक नहीं है।',  emoji: '🤒' },
  { en: 'It hurts here.',       hi: 'यहाँ दर्द है।',            emoji: '🤕' },
  { en: 'I am happy.',          hi: 'मैं खुश हूँ।',             emoji: '😄' },
  { en: 'I do not understand.', hi: 'मुझे समझ नहीं आया।',       emoji: '🤔' },
  { en: 'Please speak slowly.', hi: 'कृपया धीरे बोलिए।',        emoji: '🐢' },
  { en: 'Please wait.',         hi: 'थोड़ा रुकिए।',             emoji: '✋' },
  { en: 'Excuse me.',           hi: 'सुनिए।',                   emoji: '🙇' },
  { en: 'What is your name?',   hi: 'आपका नाम क्या है?',        emoji: '💬' },
  { en: 'Where is my phone?',   hi: 'मेरा फ़ोन कहाँ है?',       emoji: '📱' },
  { en: 'I am ready.',          hi: 'मैं तैयार हूँ।',           emoji: '👌' },
  { en: 'See you later.',       hi: 'फिर मिलेंगे।',             emoji: '🤗' },
  { en: 'I love you.',          hi: 'मैं तुमसे प्यार करता हूँ।', emoji: '❤️' }
];

export const WORDS = BASE_WORDS.concat(EXTRA_WORDS);
export const PHRASES = BASE_PHRASES.concat(EXTRA_PHRASES);

// Stable identity for every item. The English word alone is not unique -
// "orange" is both a fruit and a colour - and using it as the key would merge
// their progress and let one be accepted as the answer for the other.
for (const w of WORDS) w.id = `${w.cat}/${w.en}`;
for (const p of PHRASES) p.id = `phrase/${p.en}`;

// Reviewed example sentences, attached to whichever item they belong to.
for (const item of WORDS.concat(PHRASES)) {
  const ex = EXAMPLES[item.id];
  if (ex) item.ex = ex;
}

// Short, easy-to-decode words used by the Read mode.
export const READING_WORDS = WORDS.filter(
  (w) => w.emoji && !w.en.includes(' ') && w.en.length <= 5
);
