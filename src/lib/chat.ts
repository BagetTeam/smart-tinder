import { pick, type Rng } from './rng'
import type { Profile } from './types'

const OPENERS: Record<Profile['vibe'], string[]> = {
  witty: [
    'So the algorithm thinks we\'re intellectually compatible. Bold of it.',
    'Quick, what\'s 17 × 23? Just kidding. Unless you know it.',
    'I was told there would be puzzles on this date.',
  ],
  warm: [
    'Hey! So happy we matched 😊 How\'s your day going?',
    'Hi there! Your profile made me smile.',
    'Hey you! What\'s been the highlight of your week so far?',
  ],
  nerdy: [
    'Did you do today\'s Crowns? I think the purple region was evil.',
    'Hi! Settle a debate: tabs or spaces?',
    'Hey! What\'s your favourite unsolved problem?',
  ],
  chill: ['hey :)', 'heyy, how\'s it going?', 'yo! nice to match'],
  intense: [
    'Okay, first question: what are you optimising your life for?',
    'Let\'s skip small talk. Biggest belief you changed your mind on?',
    'I have a theory about you. Want to hear it?',
  ],
}

const REPLIES: Record<Profile['vibe'], string[]> = {
  witty: [
    'Ha! Okay you\'re funnier than your bio suggested.',
    'I\'m going to pretend I came up with that.',
    'Statistically, this is going well.',
    'Noted. Adding that to your file. 📁',
  ],
  warm: [
    'Aw I love that!',
    'That sounds amazing, tell me more!',
    'Haha you seem really fun to talk to.',
    'Okay that\'s actually so sweet.',
  ],
  nerdy: [
    'That\'s fascinating. Have you read about it in depth?',
    'Okay but have you considered the edge cases?',
    'I would 100% nerd out about this over coffee.',
    'Proof by vibes. I accept it.',
  ],
  chill: ['haha nice', 'for real', 'lol same', 'that\'s cool!'],
  intense: [
    'Interesting. Why do you think that is?',
    'I respect that. Most people don\'t think that deeply.',
    'Go on. I\'m listening.',
    'That tells me a lot about you.',
  ],
}

const KEYWORDS: [RegExp, string[]][] = [
  [/\b(hi|hey|hello|yo|hiya)\b/i, ['Hey hey! 👋', 'Hi! Glad you said hi first.', 'Hello! 😄']],
  [/\?\s*$/, ['Good question… let me think. Honestly? Probably yes.', 'Hmm, I\'d say it depends on the day!', 'Ooh, I\'ll answer if you answer first 😏']],
  [/(drink|coffee|date|meet|dinner|tonight|weekend)/i, ['I\'d be down for that! When are you free?', 'Coffee sounds perfect ☕️', 'Let\'s do it. Thursday?']],
  [/(queens|crowns|zip|thread|tango|sun|moon|math|iq|puzzle)/i, ['Okay, rematch on tomorrow\'s daily. Loser buys drinks.', 'I was SO close to a top 10 today 😭', 'Don\'t tell anyone but I guessed half of it.']],
  [/(haha|lol|lmao|😂)/i, ['😂', 'Glad I\'m amusing you', 'hehe']],
]

export function opener(rng: Rng, p: Profile) {
  return pick(rng, OPENERS[p.vibe])
}

export function replyTo(rng: Rng, p: Profile, text: string) {
  for (const [re, opts] of KEYWORDS) if (re.test(text) && rng() < 0.75) return pick(rng, opts)
  return pick(rng, REPLIES[p.vibe])
}
