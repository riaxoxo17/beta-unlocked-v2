// Rules and content for the Ignition Room, kept free of React so game.js and the dashboards can use them.
export const DEFAULT_TARGET = 1000000

export const rupees = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')

export const LEVERS = [
  { id: 'volunteers', title: 'Volunteer network', hint: 'Your own volunteers and the people closest to them' },
  { id: 'families', title: 'Parents and families', hint: 'Families of students and volunteers' },
  { id: 'alumni', title: 'Alumni and past leaders', hint: 'People who have been part of U&I before' },
  { id: 'corporates', title: 'Corporates and CSR', hint: 'Workplaces, employers and matching gifts' },
  { id: 'events', title: 'Events and community drives', hint: 'Anything you host, run or join in person' },
  { id: 'social', title: 'Social media and stories', hint: 'Public asks, posts and shared stories' },
]

// Twists the facilitator can throw at any moment. pct is the change to the plan as a share of the target.
export const TWISTS = [
  { id: 'donor', title: 'A big donor pulls out', text: 'Your largest committed donor has just cancelled. Rework the plan so you are still on track.', pct: -10, ask: 'Which lever do you grow to cover it, and how?' },
  { id: 'match', title: 'A match offer appears', text: 'A well-wishing family will match the first ₹50,000 you raise, if you reach out to them in the first week.', pct: 5, ask: 'What will you do on day one to claim it?' },
  { id: 'quiet', title: 'Your volunteers go quiet', text: 'Exams and festivals mean half your volunteer network is unreachable for a week.', pct: -8, ask: 'How do you keep momentum while they are away?' },
  { id: 'rival', title: 'Another campaign launches the same week', text: 'A similar cause is asking the same people for money. Your tagline now sounds like everyone else.', pct: 0, ask: 'Rewrite your tagline so that nobody mixes you up.' },
  { id: 'news', title: 'A reporter calls', text: 'A local journalist wants a one minute story about your campaign by tomorrow.', pct: 0, ask: 'Which one student story do you tell, and who tells it?' },
  { id: 'budget', title: 'Your event budget is cut to zero', text: 'There is no money for venues, printing or food. Whatever you plan has to run for free.', pct: -5, ask: 'Which activity survives, and what do you change?' },
]

const num = (v) => Number(String(v ?? '').replace(/\D/g, '')) || 0

export const leverTotal = (p) => LEVERS.reduce((sum, l) => sum + num(p['lev:' + l.id + ':amt']), 0)
export const thrownTwists = (p) => TWISTS.filter((t) => p['tw:' + t.id])
export const twistAdjust = (p, target) => thrownTwists(p).reduce((sum, t) => sum + Math.round((target * t.pct) / 100), 0)
export const planTotal = (p, target) => leverTotal(p) + twistAdjust(p, target)
export const toAmount = num
