// Tiny synthesized sound effects, so no audio files are needed. Browsers only allow sound after a click or tap.
let ctx
const muted = () => localStorage.getItem('beta:mute') === '1'
export const setMuted = (v) => localStorage.setItem('beta:mute', v ? '1' : '0')
export const isMuted = muted

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function note(freq, start, dur, type = 'square', gain = 0.06) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

const play = (fn) => (...args) => {
  if (muted()) return
  try {
    fn(...args)
  } catch {
    /* audio is optional */
  }
}

export const sfx = {
  tick: play(() => note(880, 0, 0.09, 'square', 0.05)),
  // Last ten seconds: one tick a second, higher and doubled in the final three.
  countdown: play((n = 10) => {
    note(n <= 3 ? 1175 : 880, 0, 0.1, 'square', n <= 3 ? 0.08 : 0.05)
    if (n <= 3) note(1175, 0.14, 0.1, 'square', 0.08)
  }),
  // Time is up: a long two-tone horn.
  horn: play(() => {
    note(220, 0, 0.9, 'sawtooth', 0.12)
    note(165, 0.05, 0.9, 'sawtooth', 0.1)
    note(220, 1.0, 0.9, 'sawtooth', 0.12)
    note(165, 1.05, 0.9, 'sawtooth', 0.1)
  }),
  wrong: play(() => {
    note(180, 0, 0.18, 'sawtooth', 0.06)
    note(140, 0.12, 0.22, 'sawtooth', 0.06)
  }),
  right: play(() => {
    note(523, 0, 0.1)
    note(784, 0.09, 0.16)
  }),
  stamp: play(() => {
    note(110, 0, 0.18, 'triangle', 0.14)
    note(660, 0.1, 0.12)
    note(990, 0.2, 0.25)
  }),
  fanfare: play(() => {
    ;[523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.13, 0.28, 'square', 0.07))
    note(262, 0, 1.2, 'triangle', 0.1)
  }),
}
