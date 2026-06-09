# 🇪🇸 Spanish Vocabulary Practice

A simple, self-contained tool for collecting Spanish words you come across in
reading and drilling them until you've learned them. No accounts, no server, no
build step — just open the page in a browser.

## How to use it

Open `index.html` in any modern browser (double-click it, or serve the folder).
That's it. Your word bank is saved automatically in the browser's local storage.

### Word Bank tab
- **Add a word**: type the Spanish and its English meaning, then *Add word*.
- Accented letters that aren't on an English keyboard are bound to keys **1–6**
  while typing in the Spanish field (or click the buttons):

  | Key | 1 | 2 | 3 | 4 | 5 | 6 |
  |-----|---|---|---|---|---|---|
  | Letter | á | é | í | ó | ú | ñ |

- Separate synonyms with a slash, e.g. `quick / fast` or `rápido / veloz`.
  Any listed variant counts as correct.
- Edit or delete any word; search to filter the list.
- **Export / Import** a JSON backup so you never lose your words (and can commit
  the file to this repo as a backup).

### Practice tab
Choose a **question type** and **which words** to drill, then *Start*:

- **Multiple choice** — see a Spanish word, pick the English meaning from five
  options. Keys **1–5** select an option.
- **Free response** — see an English word, type the Spanish. Keys **1–6** insert
  accented letters. Getting only an accent wrong gives a gentle "check the
  accents" nudge.

**Which words?**
- **Needs work** — only words you haven't mastered yet (the default).
- **All words** — your whole bank, to keep mastered words sharp.

Press **Enter** to advance to the next question.

## How learning is tracked

Each word has a confidence **level from 0 to 5** (Leitner-style):

- A correct answer raises the level by 1; an incorrect answer lowers it by 1.
- A word becomes **Mastered** at level 5 and drops out of "Needs work" practice.
- Sessions favor your weaker words, so struggling words come up more often.

The **Progress** tab shows totals and a breakdown of words by level.

## Cross-device sync (optional)

By default your bank is stored only in the browser you're using. To carry it
across devices, the **Word Bank → Cross-device sync** card backs it up to a
**private (secret) GitHub Gist**:

1. Create a token at
   [github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=gist&description=Spanish%20Practice%20sync)
   — a **classic** token with only the **`gist`** scope.
2. Paste it into the sync card and click **Connect**. The app finds (or creates)
   a secret Gist named `spanish-practice-words.json` and uploads your words.
3. On another device, open the app and paste the **same token** — your words
   are discovered and loaded automatically. No Gist ID to copy around.

Notes:
- The token is stored only in that browser's local storage. You can **Disconnect**
  anytime, or revoke the token on GitHub.
- Changes save to the Gist automatically (debounced); the pill in the top-right
  shows **Synced ✓ / Saving… / Sync error**.
- On load, the Gist is treated as the source of truth, so deletions propagate
  between devices. The first time you connect a device that already has words,
  they're merged into the Gist (keeping the best progress) so nothing is lost.
- A secret Gist is unlisted and not searchable, but anyone with its URL can view
  it — it is not truly private. Don't store anything sensitive.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Styling |
| `app.js` | All logic (word bank, practice engine, stats) |
| `sample-words.json` | Optional starter word list you can import |

## Notes

- Data lives in your browser's local storage, scoped to wherever you open the
  file from. Use **Export** regularly if you want a portable backup.
- Everything runs locally; nothing is sent anywhere.
