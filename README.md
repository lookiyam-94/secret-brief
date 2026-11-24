# Secret Brief

A one-page "top secret mission brief" for Agent Julia777: Operation Petal Strike.

Static site, no build step: `index.html`, `style.css` and `script.js`. Fonts come from Google Fonts; everything else (map, sounds, graphics) is generated in the browser.

## What's on the page

1. **Access gate**: boot log, then a press-and-hold fingerprint scan, then "ACCESS GRANTED".
2. **Handler transmission**: agent ID card (tilts on hover) and a typewritten note on paper.
3. **Mission dossier**: manila folder with the operation sheet and the target file (tap the black bars to un-redact).
4. **Tactical map**: generated city map, radar sweep, live route from the safe house via the florist to the Madhouse.
5. **Field kit and rules of engagement**.
6. **Final question**: AFFIRMATIVE / NEGATIVE (the NEGATIVE button resists a little).
7. **Self-destruct countdown**: starts after the question is answered.

Sound effects are synthesised on the fly and can be turned off with the `SND` button in the top bar.

Tip: add `#open` to the URL to skip the access gate.

## Publish with GitHub Pages

1. Create a new **public** repository on GitHub named `secret-brief` (leave it empty, no README).
2. From this folder:

   ```bash
   git init -b main
   git add .
   git commit -m "Operation Petal Strike"
   git remote add origin https://github.com/<your-username>/secret-brief.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick `main` and `/ (root)` and save.
4. After a minute or two the page is live at `https://<your-username>.github.io/secret-brief/`.

The page has `noindex` set so search engines skip it, but anyone with the link can open it.

## Preview locally

```bash
python -m http.server 8777
```

Then open http://localhost:8777.
