// Rules and content for the Ignition Room, kept free of React so game.js and the dashboards can use them.
export const DEFAULT_TARGET = 1000000

export const rupees = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
export const toAmount = (v) => Number(String(v ?? '').replace(/\D/g, '')) || 0

// Initiatives are added by the team, so each one gets its own id and its own keys: ini:<id>:t (title), :owner, :amt.
export const newInitiativeId = () => String(Date.now()) + String(Math.floor(Math.random() * 90) + 10)
export const initiatives = (p) =>
  Object.keys(p)
    .map((k) => (k.match(/^ini:(\d+):t$/) || [])[1])
    .filter(Boolean)
    .sort()
    .map((id) => ({ id, title: p[`ini:${id}:t`] || '', owner: p[`ini:${id}:owner`] || '', amt: toAmount(p[`ini:${id}:amt`]) }))

export const planTotal = (p) => initiatives(p).reduce((sum, i) => sum + i.amt, 0)

// How a team splits its focus between its own centres' targets and the Beta target. Stored as the centre share.
export const RATIOS = [70, 60, 50, 40, 30]

// Moments the facilitator can bring in at any time. They are conversations, not sums.
export const TWISTS = [
  { id: 'critic', title: 'A volunteer is turning people against the campaign', text: 'One volunteer is openly negative about the campaign and it is starting to spread among others.', ask: 'How do you respond, and who in your Betta takes it on?' },
  { id: 'stuck', title: 'One of your centres decides to do nothing', text: 'A centre in your Betta has decided not to take part in the campaign at all. It is one of yours.', ask: 'How will you show up for each other?' },
  { id: 'double', title: 'One centre doubled its target', text: 'Your Betta has hit its target, but only because one centre doubled theirs. The others are well short.', ask: 'Do you push the other centres to hit their targets, or let it be since the Betta target is met? Why?' },
  { id: 'ratio', title: 'Where does your focus go?', text: 'You cannot give everything to everything. Decide how your attention splits between your own centre targets and the Betta target.', ask: 'Why that split, and what would make you change it?', ratio: true }
]
