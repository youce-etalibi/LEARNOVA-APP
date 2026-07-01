import { useEffect, useRef, useState } from 'react'
import { useInView, animate } from 'framer-motion'

/** Counts up to `to` once it scrolls into view. */
export default function Counter({ to, suffix = '', prefix = '', decimals = 0, duration = 1.8 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
