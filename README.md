# IQupid 🧠💘

A web-based, swipe-style dating app where matchmaking runs on **two hidden ratings**: how attractive people find you (a Tinder-style *Looks Elo*) and how sharp you are (an *Estimated IQ* that moves with your daily brain-game results). You only ever see, and are only shown to, people who sit inside **both** of your brackets.

Everything runs in the browser. There's no backend: 200 mock profiles, their swipes on you, their chat replies and their daily game scores are all simulated, and your data is saved to `localStorage`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## How it works

### Looks Elo (hidden, Tinder-style)
- Every swipe *on you* counts as a game between you and the person swiping. A like is a win and a pass is a loss.
- `E = 1 / (1 + 10^((swiper − you)/400))`, then `you += K · (result − E)`. A like from someone rated above you is a big win, and a pass from someone rated below you is a big loss.
- K starts high (provisional) and settles as you collect impressions (`K = max(12, 48/√(1 + n/20))`).
- Your swipes are votes on the other person's rating in the same way.
- Mock users decide on you from a hidden "true appeal" score, plus a bonus or penalty for how complete your profile is. The app never knows that score directly. It has to *discover* it through swipes, the same way the real thing does.
- The score is hidden by default. Turn on **X-ray mode** in Profile to see it, along with every card's Elo.

### Estimated IQ (daily brain games)
Four new puzzles go up each day (seeded by date, so everyone gets the same ones). You get one attempt each:

| Game | Inspired by | Scored on |
|---|---|---|
| **Crowns** | LinkedIn *Queens*: one crown per row, column and colour region, no touching | solve time |
| **Thread** | LinkedIn *Zip*: one path through the numbers in order, filling every cell | solve time |
| **Sun & Moon** | LinkedIn *Tango*: balanced binary grid with `=` / `×` constraints | solve time |
| **Quick Maths** | Optiver's *80-in-8* / Zetamac: arithmetic speed run | correct answers in 90s |

All 200 mock players also "play" each puzzle. Their results come from their IQ plus noise, and some days are harder than others. Your result is ranked against theirs, the percentile becomes a **performance IQ** (`100 + 15·Φ⁻¹(p)`), and your estimate moves part of the way toward it. That fraction is 30% on your first game and drops toward 6% as you build a history. Giving up or running out of time counts as a DNF, which ranks last.

### Matchmaking
- Deck = people your "Show me" setting covers, within **±15 IQ** *and* **±225 Looks Elo** of you, and whom you haven't swiped on yet.
- Background impressions are drawn from the same bracket, so you're only shown to people who could be shown to you.
- When you play the dailies, your IQ bracket moves and different people show up in your deck.

## Project layout
```
src/
  lib/engine.ts        Elo, IQ estimation, brackets, simulated population scores
  lib/rng.ts, stats.ts Seeded RNG, normal CDF / inverse
  data/profiles.ts     200 deterministic mock profiles
  games/generators.ts  Puzzle generators (unique-solution Queens/Tango, backbite Hamiltonian paths for Zip)
  games/*.tsx          The four mini-games
  screens/             Onboarding, Discover, Dailies, Matches (+chat), Profile
  store.ts             Zustand store (persisted), swipe/match/impression simulation
```

**Demo tip:** Profile → *Skip to tomorrow* unlocks the next day's puzzles, so you can watch your IQ estimate and deck change over several days.

Mock photos come from randomuser.me. If they can't load, a gradient avatar shows instead.
