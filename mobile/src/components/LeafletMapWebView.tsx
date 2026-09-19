import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme, type ThemeColors } from '../theme';

export type MapPoint = {
  latitude: number;
  longitude: number;
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type LeafletMarkerKind = 'terminal' | 'from' | 'to';

export type LeafletMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  kind: LeafletMarkerKind;
  selected?: boolean;
  count?: number;
};

export type LeafletRoute = {
  coords: MapPoint[];
  color?: string;
  weight?: number;
};

export type LeafletFitPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  markers?: LeafletMarker[];
  route?: LeafletRoute | null;
  initialRegion?: MapRegion | null;
  fitPadding?: LeafletFitPadding | null;
  animateTo?: MapRegion | null;
  userLocation?: MapPoint | null;
  userAvatar?: string | null;
  autoFit?: boolean;
  onMarkerPress?: (id: string) => void;
  onLocateRequest?: () => void;
  onMapPress?: () => void;
  onRegionChange?: (region: MapRegion) => void;
};

// The app talks to the API over the LAN, so Leaflet can be loaded from the same
// origin the phone already reaches (fast + reliable) instead of waiting on a
// public CDN on every screen mount.
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const API_ORIGIN = API_URL.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
const LEAFLET_LOCAL = API_ORIGIN ? `${API_ORIGIN}/leaflet/leaflet.js` : '';
const LEAFLET_LOCAL_CSS = API_ORIGIN ? `${API_ORIGIN}/leaflet/leaflet.css` : '';
const LEAFLET_SRCS = [LEAFLET_LOCAL, 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'].filter(
  Boolean,
);

function buildHtml(colors: ThemeColors, isDark: boolean): string {
  const localCss = LEAFLET_LOCAL_CSS
    ? `<link rel="stylesheet" href="${LEAFLET_LOCAL_CSS}">`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Map</title>
${localCss}
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
  body { background: #eef2f6; }
  #map { position: absolute; top: 0; left: 0; }
  .busmap-dim {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 500;
    background: rgba(10, 14, 18, 0.4);
  }
  .pin {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 9px; border-radius: 999px;
    border: 1px solid ${colors.primary}; background: #ffffff; color: ${colors.primary};
    font: 700 11px/1.2 -apple-system, 'Segoe UI', system-ui, sans-serif;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
    cursor: pointer;
  }
  .pin svg { flex-shrink: 0; }
  .pin.sel { background: ${colors.primary}; border-color: ${colors.primary}; color: #ffffff; }
  .pin.from { background: ${colors.ink}; border-color: ${colors.ink}; color: #ffffff; }
  .pin.to { background: ${colors.teal}; border-color: ${colors.teal}; color: #ffffff; }
  .leaflet-marker-icon.busmap-pin:not(.busmap-pin-terminal) { margin: 0 !important; transform: translate(-50%, -50%); }
  .tm-pin {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${colors.primary};
    border: 2px solid #fff;
    display: grid;
    place-items: center;
    color: #0f172a;
  }
  .tm-pin i { display: grid; place-items: center; }
  .tm-pin i svg { width: 15px; height: 15px; }
  .tm-pin span {
    position: absolute;
    top: -7px;
    right: -7px;
    background: #0f172a;
    color: #e2e8f0;
    border: 2px solid #fff;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    min-width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    padding: 0 3px;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  }
  .tm-pin-empty { background: linear-gradient(135deg, #94a3b8, #64748b); }
  .tm-pin-empty span { display: none; }
  .tm-pin-sel { border-color: #fff; box-shadow: 0 0 0 3px ${colors.primarySoft}; }
  .user-dot { position: relative; width: 16px; height: 16px; }
  .user-dot .pulse {
    position: absolute; inset: -6px; border-radius: 50%;
    background: rgba(37, 99, 235, 0.28);
    animation: user-pulse 2.2s ease-out infinite;
  }
  .user-dot .core {
    position: absolute; inset: 0; border-radius: 50%;
    background: #2563eb; border: 2.5px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }
  @keyframes user-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.9); opacity: 0; } }
  .user-wrap {
    display: grid;
    justify-items: center;
    gap: 2px;
    filter: drop-shadow(0 1px 2px rgba(15, 23, 42, 0.4));
  }
  .user-wrap img { width: 36px; height: 48px; display: block; }
  .user-label {
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid #F59E0B;
    background: #ffffff;
    color: #111111;
    font: 700 11px/1.2 -apple-system, 'Segoe UI', system-ui, sans-serif;
    white-space: nowrap;
  }
  .locate-btn {
    width: 30px; height: 30px; display: grid; place-items: center;
    color: ${colors.primary}; cursor: pointer;
  }
  .locate-btn:hover { color: ${colors.primaryDeep}; }
  .leaflet-container { font-family: -apple-system, 'Segoe UI', system-ui, sans-serif; }
  .leaflet-control-zoom a { color: ${colors.ink}; }
</style>
</head>
<body>
<div id="map"></div>
<script>
;(function () {
  'use strict';
  var BUILD = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16h-4v-5h-8v5H4zm4-10h3v-3H8v3zm5 0h3v-3h-3v3z"/></svg>';
  var BUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1v1h-3v-1H9v1H6v-1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 6v4h14V9H5zm2 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>';
  var SIGNPOST = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 1.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5V3h2.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H12v10.5a.5.5 0 0 1-1 0V10H4.5v10.5a.5.5 0 0 1-1 0V10H1.5a.5.5 0 0 1-.5-.5v-6A.5.5 0 0 1 1.5 3H4V1.5zM5 3v5h6V3H5z"/></svg>';
  var STROKE = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var USER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">' +
    '<ellipse cx="24" cy="57.3" rx="15.5" ry="3" fill="#F59E0B" opacity="0.18"/>' +
    '<rect x="19.4" y="38" width="4.6" height="14" rx="2.3" fill="#1E293B"/>' +
    '<rect x="24.7" y="38" width="4.6" height="14" rx="2.3" fill="#1E293B"/>' +
    '<rect x="17.6" y="50.5" width="6.8" height="4.6" rx="2.3" fill="#0F172A"/>' +
    '<rect x="23.6" y="50.5" width="6.8" height="4.6" rx="2.3" fill="#0F172A"/>' +
    '<path d="M15 18 h18 a5 5 0 0 1 5 5 v12 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-12 a5 5 0 0 1 5 -5 z" fill="#F59E0B"/>' +
    '<path d="M15 19 Q8.5 26 10 34 L12.6 33.3 Q11.4 27 17.5 21 Z" fill="#0B7C71"/>' +
    '<path d="M33 19 Q39.5 26 38 34 L35.4 33.3 Q36.6 27 30.5 21 Z" fill="#0B7C71"/>' +
    '<circle cx="10.6" cy="35.4" r="2.4" fill="#E8B083"/>' +
    '<circle cx="37.4" cy="35.4" r="2.4" fill="#E8B083"/>' +
    '<rect x="22.2" y="14.5" width="3.6" height="4.5" rx="1.8" fill="#E8B083"/>' +
    '<circle cx="24" cy="9.5" r="6.3" fill="#E8B083"/>' +
    '<path d="M17.7 9.5 A6.3 6.3 0 0 1 30.3 9.5 L30.3 12.8 L17.7 12.8 Z" fill="#111827"/>' +
    '</svg>';
  var USER_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(USER_SVG);
  var LEAFLET_SRCS = ${JSON.stringify(LEAFLET_SRCS)};
  var IS_DARK = ${isDark};
  var srcIdx = 0;
  var map = null;
  var layers = { markers: [], route: null, user: null, dim: null };

  function post(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function zoomForDelta(delta) {
    var z = Math.round(Math.log2(360 / Math.max(Number(delta) || 8, 1e-6)));
    return Math.max(2, Math.min(19, z));
  }
  function pinHtml(p) {
    if (p.kind === 'terminal') {
      var n = Number(p.count) || 0;
      var has = n > 0;
      return '<div class="tm-pin ' + (has ? '' : 'tm-pin-empty') + (p.selected ? ' tm-pin-sel' : '') + '">' +
        '<i>' + (has ? BUS : SIGNPOST) + '</i>' +
        (has ? '<span>' + n + '</span>' : '') +
        '</div>';
    }
    var icon = (p.kind === 'from' || p.kind === 'to') ? BUS : BUILD;
    var label = p.label ? '<span>' + esc(p.label) + '</span>' : '';
    return '<div class="pin pin-' + (p.kind || 'terminal') + (p.selected ? ' sel' : '') + '">' + icon + label + '</div>';
  }
  function markerIcon(p) {
    if (p.kind === 'terminal') {
      return L.divIcon({
        className: 'busmap-pin busmap-pin-terminal',
        html: pinHtml(p),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
    }
    if (p.kind === 'user') {
      return userIcon();
    }
    return L.divIcon({ className: 'busmap-pin', html: pinHtml(p), iconSize: null });
  }
  function renderRoute(route) {
    if (layers.route) { map.removeLayer(layers.route); layers.route = null; }
    if (!route || !route.coords || route.coords.length < 2) return;
    layers.route = L.polyline(route.coords, {
      color: route.color || '#000000',
      weight: route.weight || 3.5,
      opacity: 0.9,
      interactive: false,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }
  var lastMarkersJson = '';
  function renderMarkers(markers) {
    var json = JSON.stringify(markers || []);
    if (json === lastMarkersJson) return;
    lastMarkersJson = json;
    layers.markers.forEach(function (m) { map.removeLayer(m); });
    layers.markers = [];
    (markers || []).forEach(function (p) {
      var mk = L.marker([Number(p.lat), Number(p.lng)], {
        icon: markerIcon(p),
        title: p.label || '',
        zIndexOffset: p.selected ? 1000 : 0
      });
      mk.on('click', function () { post({ type: 'markerPress', id: p.id }); });
      mk.addTo(map);
      layers.markers.push(mk);
    });
  }
  function collectPoints(p) {
    var pts = [];
    (p.markers || []).forEach(function (m) { pts.push([Number(m.lat), Number(m.lng)]); });
    if (p.route && p.route.coords) {
      p.route.coords.forEach(function (c) { pts.push([Number(c[0]), Number(c[1])]); });
    }
    return pts;
  }
  var lastUserPos = null;
  function userIcon() {
    return L.divIcon({
      className: 'busmap-user',
      html:
        '<div class="user-wrap">' +
        '<span class="user-label">Me</span>' +
        '<img src="' + USER_URL + '" width="36" height="48" alt=""/>' +
        '</div>',
      iconSize: [36, 70],
      iconAnchor: [18, 68],
    });
  }
  function renderUserLocation(ul) {
    if (layers.user) { map.removeLayer(layers.user); layers.user = null; }
    if (!ul) return;
    lastUserPos = [Number(ul.lat), Number(ul.lng)];
    layers.user = L.marker(lastUserPos, {
      icon: userIcon(),
      interactive: false,
      keyboard: false,
      zIndexOffset: 800
    }).addTo(map);
  }
  function addLocateControl() {
    var Ctrl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        var wrap = L.DomUtil.create('div', 'leaflet-bar');
        var btn = L.DomUtil.create('a', 'locate-btn', wrap);
        btn.href = '#';
        btn.title = 'My location';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>';
        L.DomEvent.disableClickPropagation(btn).disableScrollPropagation(btn);
        L.DomEvent.on(btn, 'click', function (ev) {
          L.DomEvent.preventDefault(ev);
          if (lastUserPos) {
            map.setView(lastUserPos, 15, { animate: true });
          } else {
            post({ type: 'locate' });
          }
        });
        return wrap;
      }
    });
    map.addControl(new Ctrl());
  }
  var firstUpdate = true;
  var sizeLoop = false;
  var containerDim = null;
  function update(p) {
    if (!map) return;
    p = p || {};
    if (p.container && (p.container.width > 0 || p.container.height > 0)) {
      containerDim = p.container;
    }
    renderRoute(p.route || null);
    renderMarkers(p.markers || []);
    renderUserLocation(p.userLocation);
    var pts = collectPoints(p);
    applySize();
    if (p.animateTo) {
      map.setView([Number(p.animateTo.lat), Number(p.animateTo.lng)], zoomForDelta(p.animateTo.delta || 0.8), { animate: true });
    } else if (p.autoFit !== false && pts.length) {
      var pad = p.fitPadding || { top: 60, right: 48, bottom: 120, left: 48 };
      map.fitBounds(L.latLngBounds(pts), {
        paddingTopLeft: [pad.left || 0, pad.top || 0],
        paddingBottomRight: [pad.right || 0, pad.bottom || 0],
        maxZoom: 15
      });
    } else if (firstUpdate && p.initialRegion) {
      map.setView([Number(p.initialRegion.lat), Number(p.initialRegion.lng)], zoomForDelta(p.initialRegion.deltaLat || 8), { animate: false });
    }
    firstUpdate = false;
    refreshSize();
  }
  // Explicitly size the map container in pixels: inside a native WebView the
  // CSS percentage height is often 0 until the first real layout/resize, which
  // is why the map stayed blank until the keyboard forced a resize. Prefer the
  // explicit pixel size measured on the React Native side (passed via the
  // payload) because window.innerHeight can report 0 inside the WebView.
  function applySize() {
    var el = document.getElementById('map');
    if (!el) return;
    var w = (containerDim && Number(containerDim.width)) || window.innerWidth || document.documentElement.clientWidth || 0;
    var h = (containerDim && Number(containerDim.height)) || window.innerHeight || document.documentElement.clientHeight || 0;
    if (w > 0) el.style.width = w + 'px';
    if (h > 0) el.style.height = h + 'px';
    if (map && w > 0 && h > 0) map.invalidateSize();
  }
  function refreshSize() {
    applySize();
    if (!map) return;
    if (sizeLoop) return;
    sizeLoop = true;
    var tries = 0;
    var iv = setInterval(function () {
      if (!map) { clearInterval(iv); return; }
      map.invalidateSize();
      if (++tries >= 12) { clearInterval(iv); sizeLoop = false; }
    }, 150);
  }
  function start() {
    if (!window.L) return;
    if (map) return;
    applySize();
    map = L.map('map', {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      updateWhenIdle: true
    });
    map.on('click', function () { post({ type: 'mapPress' }); });
    map.on('moveend', function () {
      var c = map.getCenter();
      var b = map.getBounds();
      post({
        type: 'mapMove',
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: b.getNorth() - b.getSouth(),
        longitudeDelta: b.getEast() - b.getWest()
      });
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    if (IS_DARK) {
      var dim = document.createElement('div');
      dim.className = 'busmap-dim';
      map.getPane('overlayPane').appendChild(dim);
      layers.dim = dim;
    }
    addLocateControl();
    map.setView([9.08, 8.6753], 6);
    window.addEventListener('resize', applySize);
    window.addEventListener('orientationchange', applySize);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && map) map.invalidateSize();
    });
    window.__busMap = { update: update, ready: true };
    applySize();
    map.invalidateSize();
    refreshSize();
    post({ type: 'ready' });
    update(window.__busMapInitial || {});
  }
  function loadNext() {
    if (window.L) { start(); return; }
    if (srcIdx >= LEAFLET_SRCS.length) return;
    var s = document.createElement('script');
    s.src = LEAFLET_SRCS[srcIdx++];
    s.onload = function () { start(); };
    s.onerror = function () { loadNext(); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applySize(); loadNext(); });
  } else {
    applySize();
    loadNext();
  }
})();
</script>
</body>
</html>`;
}

function buildPayload(
  markers: LeafletMarker[],
  route: LeafletRoute | null,
  initialRegion: MapRegion | null,
  fitPadding: LeafletFitPadding | null,
  animateTo: MapRegion | null,
  userLocation: MapPoint | null,
  userAvatar: string | null,
  autoFit: boolean,
  container: { width: number; height: number } | null,
): string {
  return JSON.stringify({
    markers: (markers || []).map((m) => ({
      id: m.id,
      lat: m.latitude,
      lng: m.longitude,
      label: m.label,
      kind: m.kind,
      selected: !!m.selected,
      count: m.count,
    })),
    route: route
      ? {
          coords: route.coords.map((c) => [c.latitude, c.longitude]),
          color: route.color,
          weight: route.weight,
        }
      : null,
    initialRegion: initialRegion
      ? {
          lat: initialRegion.latitude,
          lng: initialRegion.longitude,
          deltaLat: initialRegion.latitudeDelta,
          deltaLng: initialRegion.longitudeDelta,
        }
      : null,
    fitPadding: fitPadding || null,
    animateTo: animateTo
      ? { lat: animateTo.latitude, lng: animateTo.longitude, delta: animateTo.latitudeDelta }
      : null,
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
    autoFit: autoFit !== false,
    container: container,
  });
}

export function LeafletMapWebView({
    style,
    markers = [],
    route = null,
    initialRegion = null,
    fitPadding = null,
    animateTo = null,
    userLocation = null,
    userAvatar = null,
    autoFit = true,
    onMarkerPress,
    onLocateRequest,
    onMapPress,
    onRegionChange,
  }: Props) {
  const webRef = useRef<WebView>(null);
  const loadedRef = useRef(false);
  const payloadRef = useRef('');
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  const { colors, isDark } = useTheme();
  const html = useMemo(() => buildHtml(colors, isDark), [colors, isDark]);

  const data = useMemo(
    () => buildPayload(markers, route, initialRegion, fitPadding, animateTo, userLocation, userAvatar, autoFit, containerSize),
    [markers, route, initialRegion, fitPadding, animateTo, userLocation, userAvatar, autoFit, containerSize],
  );
  payloadRef.current = data;

  function pushNow() {
    webRef.current?.injectJavaScript(`window.__busMap && window.__busMap.update(${payloadRef.current}); true;`);
  }

  useEffect(() => {
    if (!loadedRef.current) return;
    const t = setTimeout(pushNow, 30);
    return () => clearTimeout(t);
  }, [data]);

  // Keep pushing the payload until the page confirms it is ready, so the map
  // renders without relying on the user triggering a resize (keyboard) first.
  useEffect(() => {
    const iv = setInterval(() => {
      if (loadedRef.current) clearInterval(iv);
      else pushNow();
    }, 250);
    const t = setTimeout(() => clearInterval(iv), 8000);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, []);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        loadedRef.current = true;
        pushNow();
      } else if (msg.type === 'markerPress' && typeof msg.id === 'string') {
        onMarkerPress?.(msg.id);
      } else if (msg.type === 'locate') {
        onLocateRequest?.();
      } else if (msg.type === 'mapPress') {
        onMapPress?.();
      } else if (
        msg.type === 'mapMove' &&
        typeof msg.latitude === 'number' &&
        typeof msg.longitude === 'number'
      ) {
        onRegionChange?.({
          latitude: msg.latitude,
          longitude: msg.longitude,
          latitudeDelta: Number(msg.latitudeDelta ?? 1),
          longitudeDelta: Number(msg.longitudeDelta ?? 1),
        });
      }
    } catch {
      // ignore malformed messages from the page
    }
  }

  return (
    <View
      style={[styles.map, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 || height > 0) {
          setContainerSize((prev) =>
            prev && prev.width === width && prev.height === height ? prev : { width, height }
          );
        }
      }}
    >
      <WebView
        ref={webRef}
        style={styles.webview}
        source={{ html }}
        originWhitelist={['https://*', 'http://*', 'about:*']}
        onMessage={handleMessage}
        onLoadEnd={pushNow}
        onHttpError={() => {
          // tile/leaflet failures are a progressive enhancement; ignore
        }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});
