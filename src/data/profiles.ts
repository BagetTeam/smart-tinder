import { clamp, gaussian, pick, randInt, sample, seeded } from '../lib/rng'
import type { Gender, Profile } from '../lib/types'

const WOMEN = [
  'Emma', 'Olivia', 'Ava', 'Sophia', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Ella',
  'Chloé', 'Léa', 'Camille', 'Inès', 'Manon', 'Zoé', 'Jade', 'Louise', 'Alice', 'Juliette',
  'Priya', 'Ananya', 'Meera', 'Aisha', 'Fatima', 'Yasmin', 'Leila', 'Nadia', 'Sara', 'Hana',
  'Yuna', 'Mei', 'Sakura', 'Ji-woo', 'Lin', 'Mai', 'Isabela', 'Valentina', 'Lucía', 'Camila',
  'Sofía', 'Gabriela', 'Daniela', 'Mariana', 'Ines', 'Freya', 'Astrid', 'Ingrid', 'Elsa', 'Maja',
  'Nora', 'Clara', 'Lena', 'Hannah', 'Lea', 'Greta', 'Ida', 'Zara', 'Imogen', 'Poppy',
  'Isla', 'Grace', 'Ruby', 'Lily', 'Rosie', 'Maeve', 'Niamh', 'Aoife', 'Siobhan', 'Ciara',
  'Ada', 'Iris', 'June', 'Hazel', 'Violet', 'Stella', 'Luna', 'Aurora', 'Naomi', 'Leah',
  'Tara', 'Kira', 'Vera', 'Mila', 'Daria', 'Alina', 'Elif', 'Zeynep', 'Defne', 'Amara',
  'Zuri', 'Imani', 'Ayo', 'Nia', 'Kemi', 'Thandi', 'Noor', 'Rania', 'Dalia', 'Sienna',
]

const MEN = [
  'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Theo',
  'Hugo', 'Louis', 'Gabriel', 'Arthur', 'Jules', 'Raphaël', 'Adam', 'Nathan', 'Paul', 'Mathis',
  'Arjun', 'Rohan', 'Vikram', 'Kabir', 'Omar', 'Yusuf', 'Karim', 'Amir', 'Rami', 'Tariq',
  'Kenji', 'Haruto', 'Min-jun', 'Wei', 'Hiro', 'Duc', 'Mateo', 'Santiago', 'Diego', 'Javier',
  'Andrés', 'Tomás', 'Rafael', 'Bruno', 'Pedro', 'Erik', 'Lars', 'Magnus', 'Sven', 'Axel',
  'Felix', 'Jonas', 'Leon', 'Max', 'Finn', 'Emil', 'Oskar', 'Callum', 'Rory', 'Alfie',
  'Harry', 'Jack', 'Charlie', 'George', 'Ollie', 'Cian', 'Darragh', 'Seán', 'Eoin', 'Conor',
  'Miles', 'Ezra', 'Silas', 'Jasper', 'Leo', 'Isaac', 'Caleb', 'Owen', 'Julian', 'Levi',
  'Nikolai', 'Ivan', 'Dmitri', 'Luka', 'Marko', 'Emre', 'Can', 'Kerem', 'Kwame', 'Kofi',
  'Tunde', 'Jabari', 'Malik', 'Sipho', 'Idris', 'Zayn', 'Rayan', 'Samir', 'Elias', 'Marco',
]

const JOBS = [
  'Quant Trader', 'Software Engineer', 'Product Designer', 'Med Student', 'Architect', 'Data Scientist',
  'Barista & Poet', 'Physicist', 'Chef', 'UX Researcher', 'Investment Banker', 'Nurse', 'Lawyer',
  'Founder (stealth)', 'PhD Candidate', 'Teacher', 'Journalist', 'Game Developer', 'Musician',
  'Photographer', 'Consultant', 'Pharmacist', 'Pilot', 'Veterinarian', 'Marketing Lead',
  'Civil Engineer', 'Climate Researcher', 'Actuary', 'Personal Trainer', 'Illustrator',
  'Neuroscientist', 'Product Manager', 'Chess Coach', 'Sommelier', 'Robotics Engineer',
]

const SCHOOLS = [
  'MIT', 'Stanford', 'Oxford', 'Cambridge', 'ETH Zürich', 'McGill', 'U of Toronto', 'Sorbonne',
  'Polytechnique', 'Imperial College', 'UCL', 'Waterloo', 'Berkeley', 'NYU', 'Columbia', 'TU Munich',
  'Self-taught', 'School of Life', 'Concordia', 'UBC', 'EPFL', 'KTH', 'Delft', 'Bocconi',
]

const INTERESTS = [
  'Chess', 'Bouldering', 'Sushi', 'Jazz', 'Hiking', 'Board games', 'Running', 'Wine', 'Coffee',
  'Travel', 'Philosophy', 'Poker', 'Yoga', 'Cooking', 'Photography', 'Indie films', 'Techno',
  'Sci-fi', 'Podcasts', 'Crosswords', 'Tennis', 'Skiing', 'Museums', 'Vinyl', 'Startups',
  'Astronomy', 'Thrifting', 'Baking', 'Anime', 'Climbing', 'Cycling', 'Poetry', 'Dogs', 'Cats',
  'Sudoku', 'Rubik\'s cube', 'F1', 'Surfing', 'Karaoke', 'Languages', 'Volunteering', 'Gaming',
]

const BIOS = [
  'Looking for someone who can beat me at Queens. So far undefeated (in my head).',
  'I will explain the Monty Hall problem on the first date. You have been warned.',
  'Part-time overthinker, full-time snack enthusiast.',
  'Fluent in sarcasm and three programming languages.',
  'If you can solve a Rubik\'s cube I\'ll buy dinner.',
  'Weekend hiker, weekday spreadsheet wizard.',
  'My love language is sending you interesting Wikipedia articles at 2am.',
  'Will probably ask about your favourite prime number.',
  'Here for good conversation and better coffee.',
  'Collecting passport stamps and bad puns.',
  'Swipe right if you have strong opinions on the Oxford comma.',
  'Trying every ramen place in the city. Currently at 37.',
  'Professional dog petter, amateur philosopher.',
  'Let\'s skip the small talk and debate free will.',
  'I make a mean shakshuka and an even meaner playlist.',
  'Ask me about the time I got lost in Tokyo for 9 hours.',
  'Competitive about board games, chill about everything else.',
  'Probably reading three books at once and finishing none.',
  'Morning runs, evening jazz, midnight existential crises.',
  'Daily Zip streak: 112. Looking for a player two.',
  'I believe pineapple belongs on pizza and I will die on this hill.',
  'Recovering perfectionist. Mostly recovered.',
  'Fun fact: I can name every country in alphabetical order.',
  'Optimizing my life one spreadsheet at a time.',
  'Looking for a co-pilot for spontaneous weekend trips.',
  'Can cook exactly four dishes extremely well.',
  'Mild coffee addiction, severe book addiction.',
  'Bad at texting, great in person. Allegedly.',
  'Will trade you my fries for your attention.',
  'Climbing walls and climbing the leaderboard.',
  'Looking for someone to do the crossword with on Sundays.',
  'My mental math is fast, my decisions are slow.',
  'Probably the most competitive person you\'ll match with.',
  'Into astronomy, which is a fancy way of saying I look up a lot.',
  'Not a morning person, but I\'ll make an exception for brunch.',
  'Grad student. Will work for dumplings.',
  'Plant parent to 23 plants. 22 are thriving.',
  'If we match, I\'m sending you my best riddle.',
  'Tall, dark and statistically significant.',
  'Just a person who really likes graphs.',
]

const PROMPT_QS = [
  'The way to win me over is',
  'My most irrational fear',
  'I geek out on',
  'Two truths and a lie',
  'A shower thought I recently had',
  'My simple pleasures',
  'Typical Sunday',
  'I\'m convinced that',
  'Green flags I look for',
  'The hallmark of a good relationship is',
]

const PROMPT_AS = [
  'Beating me at Tango (it has never happened).',
  'Geese. They know what they did.',
  'Game theory, sourdough, and obscure maps.',
  'I\'ve met a Nobel laureate, I\'ve run a marathon, I\'ve never lost at chess.',
  'Is a hot dog a sandwich if the bread is folded?',
  'Fresh croissants, rainy days, a solved puzzle.',
  'Farmers market, long run, longer nap.',
  'Cats are secretly running the internet.',
  'Curiosity, kindness, and knowing how to split a bill fairly.',
  'Laughing at the same dumb jokes for 40 years.',
  'A perfectly timed meme in the group chat.',
  'Black holes. Ask me anything.',
  'Someone who returns their shopping cart.',
  'A homemade pasta night and a bad movie.',
  'Bringing me a coffee without asking.',
  'Ducks have regional accents. Look it up.',
  'Spending way too long on a 1,000-piece puzzle.',
  'Solving the daily Queens before my coffee.',
]

const VIBES: Profile['vibe'][] = ['witty', 'warm', 'nerdy', 'chill', 'intense']

function interestedInFor(g: Gender, r: number): Gender[] {
  if (r < 0.2) return ['man', 'woman', 'nonbinary']
  if (r < 0.3) return [g]
  return [g === 'man' ? 'woman' : 'man']
}

function makeProfile(gender: 'man' | 'woman', i: number, name: string): Profile {
  const rng = seeded(`profile:${gender}:${i}`)
  const looks = clamp(Math.round(1200 + gaussian(rng) * 190), 650, 1800)
  const iq = clamp(Math.round(102 + gaussian(rng) * 14), 70, 150)
  return {
    id: `${gender === 'man' ? 'm' : 'w'}${i}`,
    name,
    age: randInt(rng, 21, 36),
    gender,
    interestedIn: interestedInFor(gender, rng()),
    photo: `https://randomuser.me/api/portraits/${gender === 'man' ? 'men' : 'women'}/${i}.jpg`,
    bio: pick(rng, BIOS),
    job: pick(rng, JOBS),
    school: pick(rng, SCHOOLS),
    distanceKm: randInt(rng, 1, 35),
    heightCm: Math.round((gender === 'man' ? 179 : 166) + gaussian(rng) * 7),
    interests: sample(rng, INTERESTS, randInt(rng, 3, 5)),
    prompt: { q: pick(rng, PROMPT_QS), a: pick(rng, PROMPT_AS) },
    looksElo: looks,
    iq,
    pickiness: clamp(gaussian(rng) * 0.5, -1, 1),
    vibe: pick(rng, VIBES),
  }
}

export const PROFILES: Profile[] = [
  ...WOMEN.map((n, i) => makeProfile('woman', i, n)),
  ...MEN.map((n, i) => makeProfile('man', i, n)),
]

export const PROFILE_BY_ID: Record<string, Profile> = Object.fromEntries(PROFILES.map((p) => [p.id, p]))

export const ALL_INTERESTS = INTERESTS
export const ALL_PROMPTS = PROMPT_QS
