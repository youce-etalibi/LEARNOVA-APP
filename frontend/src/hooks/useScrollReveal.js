import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Reveals every [data-reveal] element inside `scopeRef` on scroll using GSAP
 * ScrollTrigger. Optional [data-reveal="left|right|scale|fade"] variants and
 * [data-reveal-delay] stagger. No hover-scale — this is entrance only.
 */
export function useScrollReveal(scopeRef, deps = []) {
  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('[data-reveal]', scope)
      items.forEach((el) => {
        const variant = el.getAttribute('data-reveal') || 'up'
        const delay = parseFloat(el.getAttribute('data-reveal-delay') || '0')
        const from = { opacity: 0, duration: 0.9, ease: 'power3.out', delay }

        if (variant === 'left') from.x = -48
        else if (variant === 'right') from.x = 48
        else if (variant === 'scale') from.scale = 0.94
        else if (variant !== 'fade') from.y = 32

        gsap.fromTo(el, from, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          delay,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      })
    }, scope)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export { gsap, ScrollTrigger }
