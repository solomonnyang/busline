import { reactive, readonly } from 'vue'
import api from '../services/api'

/**
 * useSiteContent
 *
 * Loads the public, backend-configurable marketing content once and exposes it
 * reactively to the whole site. Everything (stats, services, testimonials, app
 * links, contact, faqs, hero copy) can be edited from the admin settings.
 */
const state = reactive({
  loading: false,
  loaded: false,
  error: null,
  content: null,
})

async function load() {
  if (state.loaded || state.loading) return state.content
  state.loading = true
  try {
    const { data } = await api.get('/site-content')
    state.content = data.data
    state.loaded = true
    return state.content
  } catch (e) {
    state.error = e
    return null
  } finally {
    state.loading = false
  }
}

export function useSiteContent() {
  return {
    state: readonly(state),
    content: state.content,
    load,
  }
}

/**
 * Safely read a dotted path from the loaded content, e.g. s('hero.title').
 * Falls back to `fallback` when missing. Works before content has loaded.
 */
export function s(path, fallback = '') {
  if (!state.content) return fallback
  const parts = path.split('.')
  let node = state.content
  for (const part of parts) {
    if (node == null) return fallback
    node = node[part]
  }
  if (node == null) return fallback
  if (typeof node === 'string' && node.trim() === '') return fallback
  return node
}