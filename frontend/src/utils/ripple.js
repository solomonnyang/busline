/**
 * Adds a material-style ripple to elements with the [data-ripple] attribute.
 * Usage: <button data-ripple>...</button>
 */
export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-ripple], .btn')
    if (!el) return
    if (el.dataset.toggle === 'dropdown') return

    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.2
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.width = span.style.height = size + 'px'
    span.style.left = x + 'px'
    span.style.top = y + 'px'
    el.appendChild(span)

    span.addEventListener('animationend', () => span.remove())
  })
}
