import { ref } from 'vue'

const isDark = ref(false)

export function useTheme() {
  return {
    isDark,
    toggle() {},
    init() {
      isDark.value = false
      document.documentElement.setAttribute('data-theme', 'light')
    },
  }
}
