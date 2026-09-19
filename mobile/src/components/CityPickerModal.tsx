import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api/endpoints';
import type { City } from '../api/types';
import { Skeleton } from './Skeleton';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (city: City) => void;
}

export function CityPickerModal({ visible, title, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchCities();
      setCities(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cities.');
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    setQuery('');
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.state || '').toLowerCase().includes(q)
    );
  }, [cities, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView
        tint="dark"
        intensity={32}
        style={styles.backdropWrap}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
      </BlurView>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <View style={styles.searchInner}>
            <Ionicons name="search" size={17} color={colors.mutedLight} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search cities…"
              placeholderTextColor={colors.mutedLight}
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.skeletonList}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={13} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="35%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>No cities found.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {item.state ? <Text style={styles.rowState}>{item.state}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
    paddingBottom: 8,
    ...shadow.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: font.bold,
    color: colors.text,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 17,
    color: colors.text,
  },
  center: {
    paddingVertical: 40,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    padding: 24,
  },
  skeletonList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    padding: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 17,
    fontWeight: font.semibold,
    color: colors.text,
  },
  rowState: {
    fontSize: 14,
    color: colors.muted,
  },
});
