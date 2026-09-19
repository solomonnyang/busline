import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Seat, SeatMapData } from '../api/types';
import { font, useTheme, useThemedStyles, type ThemeColors } from '../theme';

interface Props {
  seats: Seat[];
  selected: number[];
  max: number;
  onToggle: (seat: Seat) => void;
  layout?: SeatMapData['layout'] | null;
}

export function SeatMap({ seats, selected, max, onToggle, layout }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Explicit multi-row grid: { rows: [["A","B",null,"C","D"], ...] }.
  // null/'' marks an aisle gap or empty slot; a label maps to a physical seat.
  const gridRows = Array.isArray((layout as { rows?: unknown })?.rows)
    ? ((layout as { rows: (string | null)[][] }).rows)
    : null;

  const seatAt = (row: number, column: string) =>
    seats.find((s) => Number(s.seat_row) === row && s.seat_column === String(column)) || null;

  const columns = useMemo(() => {
    const cols = [...new Set(seats.map((s) => s.seat_column))];
    cols.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return cols;
  }, [seats]);

  const rows = useMemo(() => {
    const r = [...new Set(seats.map((s) => Number(s.seat_row)))];
    return r.sort((a, b) => a - b);
  }, [seats]);

  const aisleAfterIndex = Math.floor(columns.length / 2) - 1;

  const seatsInRow = (row: number) =>
    seats
      .filter((s) => Number(s.seat_row) === row)
      .sort((a, b) => a.seat_column.localeCompare(b.seat_column, undefined, { numeric: true }));

  const renderGrid = gridRows !== null;

  return (
    <View>
      <LinearGradient colors={[colors.surface, colors.surfaceAlt]} style={styles.shell}>
        <View style={styles.front}>
          <Text style={styles.frontLbl}>FRONT</Text>
        </View>

        <View style={styles.cabin}>
          <View style={styles.window} />
          <View style={styles.seatsArea}>
            {renderGrid ? (
              gridRows.map((cells, ri) => (
                <View key={ri} style={styles.row}>
                  <Text style={styles.rowLbl}>{ri + 1}</Text>
                  {cells.map((cell, ci) => {
                    if (typeof cell === 'string' && cell.toUpperCase() === 'DRIVER') {
                      return <DriverSeat key={ci} />;
                    }
                    if (cell === null || cell === '') {
                      return <View key={ci} style={styles.aisle} />;
                    }
                    const seat = seatAt(ri + 1, cell);
                    if (!seat) {
                      return <View key={ci} style={styles.aisle} />;
                    }
                    return (
                      <SeatButton
                        key={ci}
                        seat={seat}
                        selected={selected.includes(seat.id)}
                        onPress={onToggle}
                      />
                    );
                  })}
                </View>
              ))
            ) : (
              rows.map((row) => (
                <View key={row} style={styles.row}>
                  <Text style={styles.rowLbl}>{row}</Text>
                  {seatsInRow(row).map((seat) => (
                    <React.Fragment key={seat.id}>
                      {columns.indexOf(seat.seat_column) === aisleAfterIndex ? <View style={styles.aisle} /> : null}
                      <SeatButton
                        seat={seat}
                        selected={selected.includes(seat.id)}
                        onPress={onToggle}
                      />
                    </React.Fragment>
                  ))}
                </View>
              ))
            )}
          </View>
          <View style={styles.window} />
        </View>

        <View style={styles.rear}>
          <Text style={styles.frontLbl}>REAR</Text>
        </View>
      </LinearGradient>

      <View style={styles.legend}>
        <Legend variant="available" />
        <Legend variant="selected" />
        <Legend variant="booked" />
      </View>
    </View>
  );
}

interface SeatButtonProps {
  seat: Seat;
  selected: boolean;
  onPress: (seat: Seat) => void;
}

function SeatButton({ seat, selected, onPress }: SeatButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const booked = seat.reserved;

  if (booked) {
    return (
      <View style={[styles.seat, styles.seatBooked]} accessibilityLabel={`${seat.seat_number} booked`}>
        <View style={[styles.seatBack, styles.seatBackBooked]} />
        <Text style={[styles.seatText, styles.seatTextBooked]}>{seat.seat_number}</Text>
        <View style={styles.seatBlockLine} />
      </View>
    );
  }

  if (selected) {
    return (
      <Pressable
        onPress={() => onPress(seat)}
        accessibilityLabel={`${seat.seat_number} selected`}
        style={({ pressed }) => [styles.seat, styles.seatSelected, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
      >
        <View style={styles.seatFill}>
          <View style={[styles.seatBack, styles.seatBackSelected]} />
          <Text style={[styles.seatText, styles.seatTextSelected, styles.seatTextOnTop]}>{seat.seat_number}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(seat)}
      accessibilityLabel={`${seat.seat_number} available`}
      style={({ pressed }) => [
        styles.seat,
        styles.seatAvail,
        pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
      ]}
    >
      <View style={[styles.seatBack, styles.seatBackAvail]} />
      <Text style={[styles.seatText, styles.seatTextAvail]}>{seat.seat_number}</Text>
    </Pressable>
  );
}

function DriverSeat() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.driver} accessibilityLabel="Driver seat">
      <MaterialCommunityIcons name="steering" size={38} color={colors.ink} />
    </View>
  );
}

function Legend({ variant }: { variant: 'available' | 'selected' | 'booked' }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const label = variant === 'available' ? 'Available' : variant === 'selected' ? 'Selected' : 'Booked';
  return (
    <View style={styles.legendItem}>
      {variant === 'selected' ? (
        <LinearGradient
          colors={[colors.teal, isDark ? '#F59E0B' : '#D97706']}
          style={[styles.legendDot, styles.legendDotSelected]}
        />
      ) : (
        <View
          style={[
            styles.legendDot,
            variant === 'available' ? styles.legendDotAvail : styles.legendDotBooked,
          ]}
        />
      )}
      <Text style={[styles.legendText, variant === 'booked' && styles.legendTextBooked]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 10,
  },
  front: {
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  driver: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 42,
  },
  frontLbl: {
    fontSize: 10,
    fontWeight: font.bold,
    letterSpacing: 2,
    color: colors.muted,
  },
  cabin: {
    flexDirection: 'row',
    gap: 8,
  },
  window: {
    width: 7,
    borderRadius: 4,
    backgroundColor: colors.windowTint,
  },
  seatsArea: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rowLbl: {
    width: 16,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: font.bold,
    color: colors.mutedLight,
  },
  aisle: {
    width: 18,
  },
  seat: {
    width: 42,
    height: 46,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seatFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatAvail: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.mutedLight,
  },
  seatSelected: {
    backgroundColor: colors.teal,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  seatBooked: {
    backgroundColor: colors.booked,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  seatBack: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    height: 13,
    borderRadius: 8,
  },
  seatBackAvail: {
    backgroundColor: colors.surfaceAlt,
  },
  seatBackSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  seatBackBooked: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  seatBlockLine: {
    position: 'absolute',
    width: '140%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.mutedLight,
    transform: [{ rotate: '-30deg' }],
  },
  seatText: {
    fontSize: 14,
    fontWeight: font.bold,
  },
  seatTextOnTop: {
    zIndex: 1,
  },
  seatTextAvail: {
    color: colors.text,
  },
  seatTextSelected: {
    color: colors.white,
  },
  seatTextBooked: {
    color: colors.mutedLight,
    textDecorationLine: 'line-through',
  },
  rear: {
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 16,
    height: 18,
    borderRadius: 6,
  },
  legendDotAvail: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  legendDotSelected: {
    backgroundColor: colors.teal,
  },
  legendDotBooked: {
    backgroundColor: colors.booked,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  legendText: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.muted,
  },
  legendTextBooked: {
    color: colors.mutedLight,
    textDecorationLine: 'line-through',
  },
});
