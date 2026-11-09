// Pixel art kit. Every picture is a small grid of letters turned into SVG squares, so it stays
// sharp at any size and needs no image files. Letters map to colours in PALETTE.
import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

const PALETTE = {
  k: '#0b0b16', // outline
  w: '#f4f1ff',
  l: '#b9b6d3',
  d: '#5a5878',
  y: '#ffd23f',
  o: '#ff8a1f',
  r: '#ef4444',
  g: '#4ade80',
  t: '#2dd4bf',
  p: '#a855f7',
  n: '#8a5a3a',
  s: '#f1c9a0',
}

// Mix two hex colours (amount 0 to 1 towards `to`).
export function mix(from, to, amount) {
  const f = parseInt(from.slice(1), 16)
  const t = parseInt(to.slice(1), 16)
  const c = (shift) => Math.round(((f >> shift) & 255) * (1 - amount) + ((t >> shift) & 255) * amount)
  return '#' + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')
}

// Draws a sprite. `colors` overrides or adds palette letters (a = accent, A = accent shadow, ...).
export const Sprite = memo(function Sprite({ rows, colors = {}, scale = 4, x, y, title }) {
  const cells = useMemo(() => {
    const pal = { ...PALETTE, ...colors }
    const out = []
    rows.forEach((row, ry) => {
      let rx = 0
      while (rx < row.length) {
        const ch = row[rx]
        if (ch === '.' || ch === ' ' || !pal[ch]) {
          rx++
          continue
        }
        let end = rx
        while (end + 1 < row.length && row[end + 1] === ch) end++
        out.push({ x: rx, y: ry, w: end - rx + 1, fill: pal[ch] })
        rx = end + 1
      }
    })
    return out
  }, [rows, colors])
  const w = Math.max(...rows.map((r) => r.length))
  const inner = cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={c.w} height={1} fill={c.fill} />)
  if (x !== undefined) {
    return (
      <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges">
        {inner}
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} width={w * scale} height={rows.length * scale} shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {inner}
    </svg>
  )
})

export const SPRITES = {
  box: ['kkkkkkkk', 'kaaaaaak', 'kaakkkak', 'kaaaakak', 'kaaakaak', 'kaaaaaak', 'kaaakaak', 'kkkkkkkk'],
  star: ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'yy...yy'],
  lock: ['..kkkk..', '.kddddk.', '.kd..dk.', 'kkkkkkkk', 'kyyyyyyk', 'kyykkyyk', 'kyyykyyk', 'kyyyyyyk', 'kkkkkkkk'],
  screen: ['kkkkkkkkkkkk', 'kddddddddddk', 'kdgddddddddk', 'kddgdddddddk', 'kdgddggggddk', 'kddddddddddk', 'kkkkkkkkkkkk', '....kddk....', '..kkkkkkkk..'],
  server: ['kkkkkkkkk', 'kddddddgk', 'kkkkkkkkk', 'kddddddyk', 'kkkkkkkkk', 'kddddddgk', 'kkkkkkkkk'],
  mic: ['..kk..', '.kwwk.', '.kwwk.', '.kllk.', '..kk..', '..kk..', '..kk..', '..kk..', '.kkkk.', 'kkkkkk'],
  anvil: ['kkkkkkkkkkk.', 'kllllllllllk', '.kkllllllkk.', '...kllllk...', '...kllllk...', '..kkllllkk..', '.kkkkkkkkkk.', 'kkkkkkkkkkkk'],
  flame: ['...y...', '..yoy..', '..yoo..', '.yooro.', '.ooorro', 'oorryro', 'oorrrro', '.orrrro', '..oooo.'],
  bolt: ['....yy', '...yy.', '..yy..', '.yyyyy', '...yy.', '..yy..', '.yy...'],
  trophy: ['kkkkkkkk', 'kyyyyyyk', 'kyyyyyyk', 'kyywwyyk', '.kyyyyk.', '..kyyk..', '...kk...', '..kyyk..', '.kkkkkk.'],
  brain: ['..kkkkkk..', '.kppppppk.', 'kppkppkppk', 'kpkppkpppk', 'kppppkkppk', '.kppkppppk', '..kkkkkk..'],
  heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  tape: ['yyykkkyyykkk', 'yykkkyyykkky', 'ykkkyyykkkyy', 'kkkyyykkkyyy'],
  curtain: ['rRrR', 'rRrR', 'rRrR', 'rRrR'],
  cloud: ['..wwww..', '.wwwwwww', 'wwwwwwww'],
  moon: ['.yyy', 'yy..', 'yy..', 'yy..', '.yyy'],
}

function RoomIconInner({ room }) {
  const map = { chaos: ['bolt', {}], brain: ['brain', {}], fearless: ['trophy', {}], ignition: ['flame', {}] }
  const [k, c] = map[room]
  return <Sprite rows={SPRITES[k]} colors={c} scale={1} x={0} y={0} />
}
const ICON_SIZE = { chaos: [6, 7], brain: [10, 7], fearless: [8, 9], ignition: [7, 9] }

// Small icon for a room, in place of an emoji.
export function RoomIcon({ room, size = 28 }) {
  const [w, h] = ICON_SIZE[room]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={(size * w) / Math.max(w, h)} height={(size * h) / Math.max(w, h)} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-0.15em' }}>
      <RoomIconInner room={room} />
    </svg>
  )
}

/* ---------- People ---------- */

const SKIN = ['#f1c9a0', '#d99a6c', '#a86b45', '#7a4a2e', '#f4d7bd']
const HAIR = ['#20161f', '#4a2a1a', '#b5651d', '#101010', '#7a3b8f']
const PERSON = [
  '..hhhhhh..',
  '.hhhhhhhh.',
  '.hssssssh.',
  '.sskssksS.',
  '.ssssssss.',
  '..sssSss..',
  '..bbbbbb..',
  '.bbbBBbbb.',
  'sbbbbbbbbs',
  'sbbbbbbbbs',
  '.bbbbbbbb.',
  '..BB..BB..',
  '..kk..kk..',
]

// A player's pixel character. The same name always gets the same look.
export function Avatar({ name = '', color = '#a855f7', size = 40, ring }) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const skin = SKIN[h % SKIN.length]
  const hair = HAIR[(h >> 3) % HAIR.length]
  const colors = { h: hair, s: skin, S: mix(skin, '#000000', 0.2), b: color, B: mix(color, '#000000', 0.35) }
  return (
    <span style={{ display: 'inline-grid', placeItems: 'end center', width: size, height: size, borderRadius: 10, background: mix(color, '#0b0b16', 0.8), border: `2px solid ${ring || mix(color, '#0b0b16', 0.35)}`, overflow: 'hidden' }} aria-hidden="true">
      <Sprite rows={PERSON} colors={colors} scale={Math.floor((size - 4) / 13) || 2} />
    </span>
  )
}

/* ---------- Room scenes (wide banners) ---------- */

const SCENES = {
  chaos: {
    sky: ['#2a0a45', '#3b0f63', '#4c1480'],
    ground: '#1a0430',
    accent: '#e879f9',
    pieces: [
      ['box', 14, 24, { a: '#e879f9' }],
      ['box', 56, 28, { a: '#a855f7' }],
      ['star', 36, 8, {}],
      ['bolt', 92, 10, {}],
      ['box', 110, 26, { a: '#f0abfc' }],
      ['star', 132, 14, {}],
      ['bolt', 74, 6, {}],
    ],
    strip: 'tape',
  },
  brain: {
    sky: ['#03160f', '#052a1f', '#063a2b'],
    ground: '#010a08',
    accent: '#2dd4bf',
    pieces: [
      ['server', 6, 21, {}],
      ['screen', 30, 19, { d: '#06251d', g: '#5dffc4' }],
      ['lock', 60, 20, {}],
      ['server', 82, 21, {}],
      ['screen', 100, 19, { d: '#06251d', g: '#5dffc4' }],
      ['server', 128, 21, {}],
    ],
    strip: 'binary',
  },
  fearless: {
    sky: ['#2a0606', '#3d0a0a', '#520e0b'],
    ground: '#1a0303',
    accent: '#fbbf24',
    pieces: [
      ['mic', 74, 18, {}],
      ['star', 20, 10, {}],
      ['star', 124, 12, {}],
      ['trophy', 100, 20, {}],
      ['heart', 44, 22, {}],
    ],
    strip: 'curtains',
  },
  ignition: {
    sky: ['#240a02', '#3a1103', '#561a04'],
    ground: '#120401',
    accent: '#fb923c',
    pieces: [
      ['anvil', 56, 21, {}],
      ['flame', 24, 19, {}],
      ['flame', 100, 19, {}],
      ['flame', 118, 22, {}],
      ['flame', 10, 23, {}],
    ],
    strip: 'embers',
  },
}

const W = 144
const H = 32

export function RoomScene({ room, height, style }) {
  const s = SCENES[room]
  const stars = useMemo(() => Array.from({ length: 22 }, (_, i) => [(i * 37 + 11) % W, (i * 13) % 16, i % 3 === 0 ? 1 : 0.5]), [])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height={height} style={{ display: 'block', aspectRatio: height ? undefined : `${W} / ${H}`, ...style }} shapeRendering="crispEdges" role="img" aria-label={`Illustration of the ${room} room`} data-scene>
      <rect width={W} height="11" y="0" fill={s.sky[0]} />
      <rect width={W} height="11" y="11" fill={s.sky[1]} />
      <rect width={W} height="10" y="22" fill={s.sky[2]} />
      {stars.map(([x, y, o], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#fff" opacity={o * 0.8} />
      ))}
      {room === 'fearless' && (
        <>
          <polygon points="30,0 44,0 70,32 20,32" fill="#fbbf24" opacity="0.12" />
          <polygon points="100,0 114,0 130,32 84,32" fill="#fbbf24" opacity="0.12" />
          <rect x="0" y="0" width="9" height="32" fill="#7f1d1d" />
          <rect x="3" y="0" width="1" height="32" fill="#991b1b" />
          <rect x="135" y="0" width="9" height="32" fill="#7f1d1d" />
          <rect x="140" y="0" width="1" height="32" fill="#991b1b" />
        </>
      )}
      {room === 'ignition' && <rect y="24" width={W} height="8" fill="#7c2d12" opacity="0.5" />}
      {room === 'brain' &&
        Array.from({ length: 9 }, (_, i) => (
          <text key={i} x={6 + i * 16} y={6 + ((i * 5) % 9)} fontSize="4" fill="#2dd4bf" opacity="0.5" fontFamily="monospace">
            {(i * 7) % 2}
            {(i * 3) % 2}
            {(i * 5) % 2}
          </text>
        ))}
      <rect y="28" width={W} height="4" fill={s.ground} />
      <rect y="28" width={W} height="1" fill={s.accent} opacity="0.7" />
      {s.strip === 'tape' && Array.from({ length: 12 }, (_, i) => <Sprite key={i} rows={SPRITES.tape} x={i * 12} y={0} />)}
      {s.pieces.map(([k, x, y, c], i) => (
        <Sprite key={i} rows={SPRITES[k]} colors={c} x={x} y={y - (SPRITES[k].length > 8 ? 0 : 0)} />
      ))}
    </svg>
  )
}

/* ---------- Stamps ---------- */

export function StampArt({ room, earned, color, size = 112 }) {
  const c = earned ? color : '#6b6a86'
  const [w, h] = ICON_SIZE[room]
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${room} stamp, ${earned ? 'earned' : 'not earned yet'}`}
      initial={false}
      animate={earned ? { scale: [1.6, 1], rotate: [-25, -8], opacity: [0, 1] } : { scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 11, stiffness: 160 }}
    >
      <circle cx="50" cy="50" r="46" fill={earned ? mix(color, '#0b0b16', 0.82) : 'transparent'} stroke={c} strokeWidth="3" strokeDasharray={earned ? '0' : '6 5'} />
      {earned && <circle cx="50" cy="50" r="39" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />}
      <svg x={50 - (w * 46) / Math.max(w, h) / 2} y={22} width={(w * 46) / Math.max(w, h)} height={(h * 46) / Math.max(w, h)} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" opacity={earned ? 1 : 0.35}>
        <RoomIconInner room={room} />
      </svg>
      <text x="50" y="82" textAnchor="middle" fontSize="9" fontWeight="700" fill={c} fontFamily="Pixelify Sans, monospace">
        {earned ? 'STAMPED' : 'NOT YET'}
      </text>
      <text x="50" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill={c} opacity="0.9" fontFamily="Pixelify Sans, monospace">
        {{ chaos: 'CHAOS LAB', brain: 'BRAIN', fearless: 'FEARLESS', ignition: 'IGNITION' }[room]}
      </text>
    </motion.svg>
  )
}

/* ---------- Doors ---------- */

// A pixel-style door. When `open`, the leaf swings back and the light behind it shines through.
export function DoorArt({ color, number, open, width = 150 }) {
  const dark = mix(color, '#0b0b16', 0.7)
  const mid = mix(color, '#0b0b16', 0.35)
  return (
    <svg viewBox="0 0 60 92" width={width} shapeRendering="crispEdges" role="img" aria-label={`Door ${number}, ${open ? 'open' : 'locked'}`}>
      <rect x="2" y="12" width="56" height="80" fill="#05050c" />
      <rect x="2" y="10" width="56" height="3" fill={color} />
      <rect x="0" y="12" width="4" height="80" fill={color} />
      <rect x="56" y="12" width="4" height="80" fill={color} />
      <rect x="4" y="14" width="52" height="78" fill={open ? mix(color, '#ffffff', 0.7) : '#0a0a14'} />
      {open && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <rect x="4" y="14" width="52" height="78" fill="url(#rays)" opacity="0.8" />
          <rect x="22" y="44" width="16" height="3" fill="#fff" opacity="0.9" />
          <rect x="26" y="40" width="8" height="3" fill="#fff" opacity="0.7" />
          <rect x="26" y="49" width="8" height="12" fill={mid} />
        </motion.g>
      )}
      <defs>
        <linearGradient id="rays" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor={color} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <motion.g style={{ originX: 0, originY: 0, transformBox: 'fill-box' }} initial={false} animate={{ scaleX: open ? 0.12 : 1 }} transition={{ type: 'spring', damping: 14, stiffness: 70 }}>
        <rect x="4" y="14" width="52" height="78" fill={dark} />
        <rect x="8" y="18" width="20" height="30" fill={mid} />
        <rect x="32" y="18" width="20" height="30" fill={mid} />
        <rect x="8" y="52" width="20" height="34" fill={mid} />
        <rect x="32" y="52" width="20" height="34" fill={mid} />
        <rect x="10" y="20" width="16" height="26" fill={dark} />
        <rect x="34" y="20" width="16" height="26" fill={dark} />
        <rect x="46" y="62" width="4" height="4" fill="#ffd23f" />
      </motion.g>
      <text x="30" y="8" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="Pixelify Sans, monospace">
        {String(number).padStart(2, '0')}
      </text>
      {!open && (
        <g>
          <rect x="24" y="64" width="12" height="9" fill={color} />
          <rect x="26" y="59" width="8" height="2" fill={color} />
          <rect x="26" y="59" width="2" height="6" fill={color} />
          <rect x="32" y="59" width="2" height="6" fill={color} />
          <rect x="29" y="67" width="2" height="3" fill="#0b0b16" />
        </g>
      )}
    </svg>
  )
}
