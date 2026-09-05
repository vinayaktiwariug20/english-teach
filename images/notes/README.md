# Note photographs

Drop photographs of rupee notes here and name them in `NOTE_PHOTOS` in
`js/notes.js`:

```js
export const NOTE_PHOTOS = {
  10: './images/notes/10.jpg',
  20: './images/notes/20.jpg',
  50: './images/notes/50.jpg'
};
```

Any denomination you leave out keeps the drawn note, so a partial set is fine,
and a file that fails to load falls back to the drawing rather than leaving a
gap.

## Taking them

Photograph the notes in your own wallet. You own those pictures outright, which
sidesteps the licensing problem with images found online — current notes are a
Government of India work as well as somebody's photograph — and they are the
notes actually in circulation where the learner lives, which a generic drawing
can never be.

- One side, filling the frame, straight on rather than at an angle.
- Flat light. A phone camera on a table by a window is ideal; a flash puts a
  bright patch across the middle of the note.
- The app crops to the note's real proportions, so there is no need to trim.
- Keep them small — about 600px on the long edge is plenty for a picture that
  is never shown wider than a phone. These are the only bitmaps in the app and
  they are downloaded onto every device that installs it.

They are cached for offline use the first time they are shown, not at install,
so open Money once while online after adding them.
