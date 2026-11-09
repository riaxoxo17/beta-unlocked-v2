# Beta: Unlocked

Website for the 20-player, four-team event (Gather Classic plus this site). React, Vite, Tailwind, Framer Motion.

Pages (hash routes): `/#/` join, `/#/play` player (add `?embed=1` inside Gather), `/#/screen` big screen, `/#/gm` Game Master, `/#/facilitator` team facilitators.

## Rehearse on your computer (no Supabase)

    npm install
    npm run dev

Open several tabs. Each tab can be a different player. Game Master passcode: `gm`.
Facilitators: GM > Setup and reset > assign a name and code, then open `/#/facilitator` and use that code.

## Go live with Supabase

1. Create a Supabase project.
2. SQL editor: paste and run `supabase/schema.sql` (safe to run again; it also removes the open policies of the first version).
3. Set the Game Master passcode (choose your own):

       supabase login
       supabase link --project-ref YOUR_PROJECT_REF
       supabase secrets set BETA_GM_PASSCODE=your-passcode

4. Deploy the function (JWT check is already off in `supabase/config.toml`):

       supabase functions deploy beta-api --no-verify-jwt

5. Copy `.env.example` to `.env.local`, fill in the bare project URL and the publishable key, then `npm run build`.
6. Host the `dist` folder anywhere static (Netlify, Vercel, GitHub Pages). Share the URL with players.

How it is protected: the browser never touches the tables. Every table has row level security with no policies; only the `beta-api` function (service role) can read or write. Players see only their own team's answers. Identity names leave the server only at the "name" stage of the reveal, or after a door is marked done. Wrong passcode or code guesses are rate limited. Facilitator codes are stored hashed.

Known limits: stamps are awarded by the player's browser (honest-player model, fine for a friendly event). Live state refreshes about every 1.5 seconds, so a change can take a moment to show up on other phones.

## Identity reveal on the night

1. Game Master > Identity reveal > switch on "Reveal open".
2. Each team's facilitator opens `/#/facilitator` and runs their own team: show the clue, start the countdown (the name appears by itself after 5 seconds), finish. Only that team sees it. The Game Master can run any team too.
3. When every team has seen its name, the Game Master presses "Show all four names to everyone". All phones and the big screen show the four names together. "Hide the finale" turns it off; "Close all doors again" resets the reveal.

## Before the event

- Edit the four names, taglines and clues: GM > Identity reveal.
- Brain Factory answers live in `scripts/answer-key.json`; run `npm run gen:answers` after changing them.
- Team codes (PURPLE, TEAL, GOLD, RED) are in `src/lib/config.js` and `supabase/functions/beta-api/logic.ts`. Change both together.

## Tests

    npm test

Runs game rules, the reveal rules, and the whole backend (real `schema.sql` in a local Postgres, driven through the real API handler).
