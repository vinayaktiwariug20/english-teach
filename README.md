# My English

A quiet, offline, ad-free way to learn English from Hindi.

Built for an adult beginner with a learning disability who reads Devanagari and
speaks everyday Hindi, and for whom an ad or an unexpected popup ends the
session. It should suit any beginner who needs a calm, narrow interface.

No account. No ads. No network access at all once it has loaded — which is what
guarantees nothing can ever interrupt a session. Progress lives in the device's
own storage and never leaves it.

---

## What the learner sees

A start screen, then four choices. That is the entire interface.

| Mode | Hindi | What the learner does |
| --- | --- | --- |
| **Words** | शब्द | Picture, English word, Devanagari. Tap to hear it. |
| **Listen** | सुनो | Hears an English word, taps the matching picture. |
| **Read** | पढ़ो | Sees a written English word, taps the matching picture. |
| **Say it** | बोलो | Useful everyday phrases, spoken in both languages. |
| **Sentences** | वाक्य | Whole sentences - "I ate an apple yesterday" - with the picture and both languages. |
| **Money** | पैसे | A shop transaction, step by step, with the change to work out. |

Roughly 190 words across 12 topics, 30 phrases, and 2,159 generated sentences,
plus endlessly generated shop transactions.

### The rules the interface follows

- **One screen, one job.** Every screen has one obvious action and a single
  large 🏠 button in the same corner.
- **Nothing extra is tappable.** No links, no menus, no settings, nothing that
  leads out of the app.
- **Wrong answers cost nothing.** A soft nudge, the word repeated, and the right
  answer still waiting. No timers, no streaks, no losing, no dead ends — running
  out of cards reshuffles instead of stopping.
- **Nothing can be swiped or zoomed away.** Scrolling, zoom, text selection,
  long-press menus and drag are all disabled on the learner's screens.
- **The Android back button cannot exit.** It returns to the home screen. (The
  system's own gestures still work - see *Locking the device* below.)
- **The screen will not sleep** mid-lesson.
- **Difficulty adjusts itself**, starting at 2 pictures and widening to 3 or 4
  only once the learner is answering most questions correctly. Words unseen or
  recently missed come around more often.
- **A wrong answer is never eliminable on sight.** Words are drawn three
  different ways - a picture, a colour disc, a numeral - and that lines up
  almost exactly with the topic, so a question mixing them could be answered
  without listening: hear a colour, pick the only disc. Distractors therefore
  come from the target's own drawing style first. Measured over 10,000
  questions, this was happening in 31% of two-picture questions and is now 0%
  at every level; `js/quiz.js` holds the rule.
- **Numbers are held out of Listen** by default. Matching a spoken number to a
  numeral is arithmetic reading rather than vocabulary, and at twenty words they
  were about a tenth of every session. They are practised in Money, and on their
  own in Words. A caregiver switch puts them back.

---

## Levels

Everything does not arrive at once. Four levels, each adding to the one before
and never taking anything away:

| | | What it adds |
| --- | --- | --- |
| 1 | शब्द | Pictures, words, listening, reading, everyday phrases. |
| 2 | वाक्य | Whole sentences: past and present, three verbs. 311 of them. |
| 3 | और वाक्य | Future, continuous, negatives, he and she, questions, going places. Ten verbs, 2,159 sentences. |
| 4 | पैसे | Shopping: prices, paying, and working out the change. |

**The caregiver sets the level; the app never changes it.** The caregiver screen
shows how far off the next one is - words learned, questions answered, accuracy
- and marks a level *ready* when those are met, but a tile appearing on its own
mid-session is exactly the kind of surprise that ends a session, and a number is
a worse judge of readiness than the person sitting alongside.

At level 1 the home screen is the original four tiles, which is a calmer place
to start than six.

Levels arrived after the app was already in use, so anyone with existing
progress keeps every mode they had; only a fresh install begins at level 1.

---

## The caregiver screen

Settings are reachable only by tapping **the four corners of the home screen in
this order, within six seconds**:

> **top-left → bottom-right → top-right → bottom-left**

Nothing on screen reacts until the whole sequence is correct — no highlight, no
prompt, no half-finished state — so a stray corner tap does nothing visible, and
there is no popup to get stuck in.

There you can set speaking speed and voices, turn spoken Hindi on or off, fix the
number of answer choices, switch topics on and off, and see progress.

---

## Running it on Windows

Double-click **`start-windows.bat`**.

It starts a small local server and opens Chrome (or Edge) in fullscreen app
mode — no address bar, no tabs, no menus. Closing the window ends the session;
the server window can be closed afterwards.

To make it a real installed app instead, open `http://localhost:8137/` in Chrome
and use **⋮ → Cast, save and share → Install page as app**. It then has its own
Start-menu entry and window.

### Trying it on a phone without hosting anything

```
python tools/serve.py 8137 --lan
```

prints a `http://192.168.x.x:8137/` address that a phone on the same Wi-Fi can
open. Speech works over plain LAN, so this is enough to hear the device's real
voices. Install-to-home-screen and offline caching need HTTPS, so those still
require hosting. `--lan` serves the folder to your local network - stop it when
you are done.

`tools/phone-preview.html` shows the app at three phone viewport sizes in
iframes, which is a real layout test (inside a frame, `vh`/`vw` resolve to the
frame). Note that `scrollWidth` cannot detect overflow here: `body` has
`overflow: hidden`, which clamps it. Compare element rectangles against
`innerWidth`/`innerHeight` instead.

## Running it on Android

Android needs the app served over HTTPS before it can be installed to the home
screen and cached offline. A local `http://192.168.…` address will not do — the
browser blocks offline caching on those.

The simplest free host is GitHub Pages:

1. Create a repository and push this folder to it.
2. Repository **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. Wait a minute, then open the `https://<user>.github.io/<repo>/` address it
   gives you, on the learner's phone in **Chrome**.
4. **⋮ → Add to Home screen.**

After that first load the app works with the phone in aeroplane mode. Opening it
from the home-screen icon launches it fullscreen: no address bar, no tabs,
nothing to tap out of.

---

## Sentences

Words alone do not get anyone to "I ate an apple yesterday". That mode is built
from verbs crossed with tense frames over grammar-tagged nouns, in
`js/sentences.js`. Ten verbs, eleven frames and ninety-one tagged nouns, plus
four standalone templates, give 2,159 sentences. Adding a verb costs five sets
of Hindi forms and some noun tags; adding a frame costs one function.

Verbs: eat, drink, see, wear, wash, buy, open, close, and the two motion verbs
go and come. Frames cover simple past, simple present, present continuous,
future and negative past for "I"; past, present and continuous for "he" and
"she"; and questions addressed to "you".

```
कल मैंने सेब खाया।            I ate an apple yesterday.
मैं सेब खाता हूँ।              I eat an apple.
मैं सेब खा रहा हूँ।            I am eating an apple.
कल मैं सेब खाऊँगा।            I will eat an apple tomorrow.
मैंने सेब नहीं खाया।           I did not eat an apple.
वह सेब खाती है।              She eats an apple.
क्या तुमने सेब खाया?           Did you eat an apple?
कल मैं बाज़ार गया।            I went to the market yesterday.
क्या तुम पार्क गए?            Did you go to the park?
```

Four things the generator has to get right that a naive join would not:

- **Perfectives are irregular**, so each verb stores its forms rather than
  deriving them: खा becomes खाया, पी becomes पिया, and बंद करना inflects on its
  करना half (बंद किया).
- **Transitive and intransitive past differ.** A transitive past takes ergative
  ने and agrees with the object; an intransitive one has no ने and agrees with
  the subject. मैंने सेब खाया, but मैं बाज़ार गया.
- **तुम takes the plural perfective** even for one person: क्या तुम पार्क गए,
  never गया. Questions in the past are also the safest ones to teach, because
  the ergative means the listener's own gender never enters into it.
- **The article is derived, not stored.** A noun only records whether it takes
  one; whether it is "a" or "an" comes from the word, because storing "a" next
  to "office" is a typo waiting to happen and was one.
- **English and Hindi number disagree.** "pants", "glasses" and "scissors" are
  plural in English while पैंट, चश्मा and कैंची are singular, so nouns carry
  `enN` separately from `n` - one number for both gets one language wrong.

A verb can skip frames whose English is unnatural for it: nobody says "I was
seeing a dog".

Every fourth card is a recognition question: the sentence is spoken and the
learner taps the right picture. Sentences are shown as picture pairs - the verb, then what it
acts on, with a tense mark where there is room: 🍽️⏪ for "I ate", 🍽️⏩ for "I
will eat", 🍽️❌ for "I did not eat", 🧼❓ for "Did you wash", 👩🍽️ for "She eats",
🚶⏪ for "I went". Nothing has to be read. A frame needing all three glyphs
(👨🍽️⏪) will not fit a choice tile, so it is taught on cards and left out of
the questions. Choices are drawn from the four sentences just shown, and never
share a picture pair, so the answer is always decidable.

Two tenses agree with the **subject** rather than the object, which means the
learner's own gender changes the Hindi: "I will eat" is कल मैं खाऊँगा for a boy
and कल मैं खाऊँगी for a girl. The caregiver screen has that setting; it only
affects sentences that say "I". Note also that कल is both *yesterday* and
*tomorrow* - the verb tense is what separates them, which is real Hindi and
worth meeting early.

**The one thing worth checking is the gender tags.** A wrong tag silently
corrupts every sentence built from that noun. `tools/review/genders.txt` lists
each noun with a sentence whose verb ending reveals its tag; scanning that file
is a five-minute job and fixing one is a single letter in `NOUNS`.

---

## Money

Not arithmetic drill - a shop transaction walked through end to end, because
that is where the arithmetic actually gets used:

```
टोपी छह रुपए की है।              The cap costs six rupees.
मेरे पास दस रुपए हैं।             I have ten rupees.
मैं दुकानदार को दस रुपए दूँगा।     I will give the shopkeeper ten rupees.
कितने रुपए बचे?                  How many rupees are left?      10 − 6 = ?
चार रुपए बचे। उनका क्या करोगे?     Four rupees are left. What will you do with them?
मैं चार रुपए घर वापस लाऊँगा।       I will bring four rupees home.
```

Only one step asks for an answer; the rest are read and heard. The wrong
options are near misses (one or two rupees out), never negative, so a mistake
means a miscount rather than a wild guess. The closing "what will you do with
them?" expects no answer - it is a cue for the person sitting alongside.

The Hindi has three things to keep straight, and getting any of them wrong
would teach the mistake:

- रुपया is singular, रुपए plural: एक रुपया बचा, but चार रुपए बचे।
- The price agrees with the item's gender: टोपी छह रुपए **की** है, but छाता नौ
  रुपए **का** है।
- दूँगा and लाऊँगा agree with the speaker, so they follow the learner setting.

The highest price is set on the caregiver screen (₹5, ₹10, ₹20 or ₹50), which
is the difficulty dial. Number words now run to twenty in the vocabulary too,
so they can be met in Words and Listen before they turn up as change.

---

## Locking the device

This is the part the app cannot do for itself, and it matters more than
anything in the interface.

Installed to the home screen, the app runs fullscreen with no address bar, no
tabs and no menus, and nothing inside it leads anywhere else. But it is still a
page on a device: **the system gestures still work.** A swipe up goes home, the
back gesture leaves, the notification shade pulls down. No web app of any kind
can prevent that - not this one, and not a native app either. Stopping it is a
setting on the device.

**Android - Screen pinning.** Settings → Security (or Security & privacy) →
More security settings → App pinning. Turn it on, then open the app, swipe up
and hold to show recents, and tap the pin icon on its card. The device is now
stuck in the app.

How you get *out* varies by phone and by which navigation style is in use -
usually holding Back and Overview together, or swiping up and holding. Some
builds offer *Ask for PIN before unpinning* on the same settings screen; enable
it if it is there. If it is not, the hold gesture alone is still far beyond an
accidental tap, which is what this is guarding against.

This is the single most useful thing to set up, it is built into Android, and it
takes about two minutes.

**iPhone/iPad - Guided Access.** Settings → Accessibility → Guided Access. Turn
it on, set a passcode, then triple-click the side button inside the app.

**Windows.** A chromeless window is not a lock: Alt-Tab and the Windows key
still work. `start-windows.bat` is fine for supervised use. For unsupervised
use, set up Assigned Access (kiosk mode) for a dedicated account.

Install the app first and pin *that*. Pinning the browser instead leaves the
address bar reachable, and pins a browser rather than a lesson.

---

## Voices

Speech uses the device's own voices, so no audio is ever downloaded or streamed
by the app itself.

**One caveat that matters.** Chrome also exposes Google's *cloud* voices
alongside the locally installed ones, and those need a live connection. On a
stock Windows 10 machine the only Hindi voice available is usually the cloud one
(`Google हिन्दी`), which means Hindi audio goes silent the moment the device is
offline — exactly the situation this app is built for. The app prefers a local
voice whenever one exists, marks cloud voices as *needs internet* in the voice
pickers, and shows a warning on the caregiver screen when either language has
landed on one.

To install a real on-device voice:

- **Windows** — Settings → Time & language → Language & region → add **Hindi** →
  Language options → install **Speech**.
- **Android** — install *Google Text-to-speech*, then Settings → System →
  Languages & input → Text-to-speech output → download **Hindi**.

If no Hindi voice exists at all, the app shows Devanagari as text and stays
silent in Hindi rather than reading it with an English voice.

English voices are ranked so a local one always beats a cloud one, and Windows
10's legacy `Microsoft Ravi` and `Microsoft Heera` are demoted: they are
Indian-accented, which suits a Hindi speaker, but they are thin, quiet voices that
sound like 1998, and a modern voice on the same machine teaches better. On
Android the Google Indian-English voices are good and are preferred normally.

The caregiver screen lists every voice actually found, previews each one, and
has a separate **volume** slider per language — cloud and local voices are often
mismatched in loudness, and this is how you balance them.

---

## Changing the words

Everything the learner meets lives in `js/data.js`. Each entry is one line:

```js
{ cat: 'food', en: 'apple', hi: 'सेब', emoji: '🍎' },
```

Colors use `swatch: '#e23b3b'` and numbers use `num: '3'` instead of `emoji`.
Add a line, reload, and it appears everywhere — including in the quizzes.

Two things worth keeping to when adding words:

- Pick emoji from Emoji 13 or earlier, or Windows 10 shows an empty box.
- Avoid emoji that are really letters (🆘 renders as the word "SOS"), since the
  picture is the whole point for a learner who cannot read yet.

Personal words — familiar faces, favourite foods, places the learner knows — are
usually worth more than more vocabulary, and swapping the emoji for real photos is a
small change to `pictureNode()` in `js/app.js` if you want to go further.

---

## Drafting new content with a local model

`tools/generate.py` drafts candidates with a model running on your own PC via
Ollama; you review them; `tools/merge.py` folds in only what you approved. The
model never runs on the learner's device and the app never calls it - the runtime stays
static, offline and deterministic.

```
python tools/generate.py --check                      # what's installed and parsed
python tools/generate.py sentences --topic food       # example sentences for existing words
python tools/generate.py words --topic kitchen        # new vocabulary
python tools/generate.py phrases                      # new everyday phrases
python tools/merge.py tools/review/<file>.txt         # fold in the approved lines
```

Generation writes a plain-text file to `tools/review/`. Approve a candidate by
putting an `x` in its box; edit any line first if you want to. What you approve
is what gets merged, not what the model wrote.

```
[x] food/apple
    en:    I eat an apple.
    hi:    मैं सेब खाता हूँ।
    gloss: i me apple I-eat
```

The `gloss` line is a word-by-word literal rendering of the model's Hindi, so
the Hindi can be checked without trusting the model's own English.

**Review every Hindi line.** This is the whole point of the two-step design. An
8B model produces Hindi that reads fluently and is still wrong - wrong gender
agreement, a missing postposition, textbook register instead of how people
actually speak. In the first test run five of six sentences were clean and one
was not: `मैं चावल दाल खा रहा हूँ।` for "I am eating rice with dal" drops the
"with" and reads as "I am eating rice dal". That one is exactly what the review
step is for. The learner cannot tell a wrong translation from a right one, so
this file is the only thing between the model and what they learn.

Approved content accumulates in `tools/approved.json` and is compiled to
`js/generated.js`, which `js/data.js` folds in. Hand-written content in
`data.js` is never touched. `python tools/merge.py --rebuild` regenerates
`generated.js` from the approved record alone.

Approved example sentences appear under the word on its card in Words and Say
it, and can be tapped to hear.

### Notes on models

Defaults to `llama3.1:8b-instruct-q4_K_M`; `--model` picks another. On a 4 GB
card a batch of six sentences takes roughly two minutes - the model is partly
on the CPU. That is fine for work you run once and walk away from.

Qwen-family models are generally stronger in Hindi than Llama at the same size,
so `ollama pull qwen2.5:7b-instruct-q4_K_M` is worth trying if the Hindi needs
too many corrections.

`js/generated.js` currently holds five example sentences approved during a test
run. Empty the `examples` object in `tools/approved.json` and re-run
`python tools/merge.py --rebuild` if you would rather start clean.

---

## Layout

```
index.html            app shell
css/app.css           all styling
js/data.js            vocabulary and phrases (hand-written)
js/sentences.js       sentence templates and noun grammar tags
js/money.js           shop transactions and Hindi number words
js/quiz.js            question building for Listen and Read
js/generated.js       approved model-drafted content, compiled by merge.py
js/app.js             screens, quiz logic, the caregiver corner code
js/speech.js          text-to-speech and the sound effects
js/store.js           progress and settings in localStorage
sw.js                 offline cache
manifest.webmanifest  makes it installable
tools/serve.py        local server
tools/phone-preview.html  the app at phone viewport sizes, for layout checks
tools/generate.py     drafts content with a local model, for review
tools/merge.py        folds approved content into js/generated.js
tools/gen_icons.py    regenerates the PNG icons
start-windows.bat     one-click launch on Windows
```

No build step, no dependencies, no framework.

### Updating an installed copy

The service worker serves from cache first, then quietly refreshes in the
background, so a change you publish is picked up the next time the app is
opened. If you change files in `sw.js`'s asset list, bump the `CACHE` version
string in `sw.js` so the old cache is discarded.
