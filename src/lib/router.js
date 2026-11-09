import { useEffect, useState } from 'react'

function parse() {
  const h = location.hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = h.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs))
  if (query.embed === '1') sessionStorage.setItem('beta:embed', '1') // opened inside a Gather object
  return { path: path || '/', query }
}

export function useHash() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const f = () => setR(parse())
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return r
}

export const nav = (p) => {
  location.hash = p
}
export const isEmbed = () => sessionStorage.getItem('beta:embed') === '1'
