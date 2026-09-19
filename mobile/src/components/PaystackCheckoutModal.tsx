import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';

const CALLBACK_SCHEME = 'busline://';

const INJECTED_JS = `;(function () {
  if (window.__busIntercept) return;
  window.__busIntercept = true;
  var SCHEME = 'busline://';
  var go = function (url) { window.location.href = url; };
  var origOpen = window.open;
  window.open = function (u) {
    if (typeof u === 'string' && u.indexOf(SCHEME) === 0) { go(u); return null; }
    return origOpen ? origOpen.apply(window, arguments) : null;
  };
  window.setInterval(function () {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (href.indexOf(SCHEME) === 0) { go(href); return; }
    }
  }, 1000);
})();`;

interface Props {
  url: string;
  onClose: () => void;
  onVerified: (reference: string) => Promise<void>;
}

/**
 * Bottom-sheet WebView that runs the Paystack checkout inside the app.
 * When Paystack redirects to the busline:// payment callback, the
 * navigation is intercepted, the reference is extracted and onVerified
 * is invoked so the parent can confirm the top-up and update the wallet.
 */
export function PaystackCheckoutModal({ url, onClose, onVerified }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { height: screenHeight } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const handledRef = useRef(false);

  const sheetHeight = Math.min(screenHeight * 0.86, 620);

  useEffect(() => {
    handledRef.current = false;
    setLoading(true);
    setVerifying(false);
    setError('');
  }, [url]);

  async function handleCallback(callbackUrl: string) {
    if (handledRef.current) return;
    const reference = extractReference(callbackUrl);
    if (!reference) return;
    handledRef.current = true;
    setVerifying(true);
    try {
      await onVerified(reference);
    } catch (e) {
      handledRef.current = false;
      setVerifying(false);
      setError(e instanceof Error ? e.message : 'Could not confirm your payment.');
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <BlurView tint="dark" intensity={28} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} />
        </BlurView>

        <View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="lock-closed" size={14} color={colors.ink} />
              </View>
              <Text style={styles.headerTitle}>Pay with Paystack</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {verifying ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.ink} size="large" />
              <Text style={styles.overlayText}>Confirming your payment…</Text>
            </View>
          ) : error ? (
            <View style={styles.overlay}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
              </View>
              <Text style={styles.overlayTitle}>Payment not confirmed</Text>
              <Text style={styles.overlayText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={onClose}>
                <Text style={styles.retryBtnText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.webWrap}>
              <WebView
                key={url}
                source={{ uri: url }}
                style={styles.web}
                originWhitelist={['https://*', 'http://*', 'busline://*', 'about:*']}
                injectedJavaScript={INJECTED_JS}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onOpenWindow={(syntheticEvent) => {
                  const target = syntheticEvent.nativeEvent.targetUrl ?? '';
                  if (target.startsWith(CALLBACK_SCHEME)) handleCallback(target);
                }}
                onError={(e) => {
                  const failingUrl = e.nativeEvent.url ?? '';
                  if (failingUrl.startsWith(CALLBACK_SCHEME)) {
                    handleCallback(failingUrl);
                    return;
                  }
                  setError('Unable to load the payment page. Please try again.');
                  setLoading(false);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  if (request.url.startsWith(CALLBACK_SCHEME)) {
                    handleCallback(request.url);
                    return false;
                  }
                  return true;
                }}
                onNavigationStateChange={(navState) => {
                  if (navState.url.startsWith(CALLBACK_SCHEME)) {
                    handleCallback(navState.url);
                  }
                }}
              />
              {loading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={colors.ink} size="large" />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function extractReference(callbackUrl: string): string | null {
  const query = callbackUrl.split('?')[1] ?? '';
  const parts = query.split('&').map((p) => p.split('='));
  const ref = parts.find(([k]) => k === 'reference' || k === 'trxref');
  return ref && ref[1] ? decodeURIComponent(ref[1]) : null;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  webWrap: {
    flex: 1,
  },
  web: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surface,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  overlayTitle: {
    fontSize: 19,
    fontWeight: font.bold,
    color: colors.text,
    marginBottom: 6,
  },
  overlayText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.white,
  },
});