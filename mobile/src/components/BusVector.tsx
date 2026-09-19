import React from 'react';
import { Circle, Rect, Svg } from 'react-native-svg';
import { useTheme } from '../theme';

interface Props {
  size?: number;
  color?: string;
}

export function BusVector({ size = 40, color }: Props) {
  const { colors } = useTheme();
  const body = color || colors.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 40">
      <Rect x="2" y="5" width="60" height="27" rx="7" fill={body} />
      <Rect x="7" y="6" width="50" height="3" rx="1.5" fill={colors.white} opacity="0.2" />
      <Rect x="8" y="9" width="11" height="10" rx="2" fill={colors.primarySoft} />
      <Rect x="23" y="9" width="9" height="10" rx="1.5" fill={colors.primarySoft} />
      <Rect x="35" y="9" width="9" height="10" rx="1.5" fill={colors.primarySoft} />
      <Rect x="47" y="9" width="8" height="10" rx="1.5" fill={colors.primarySoft} />
      <Rect x="2" y="23" width="60" height="3" fill={colors.primaryDeep} opacity="0.3" />
      <Circle cx="18" cy="34" r="5" fill={colors.text} />
      <Circle cx="18" cy="34" r="2" fill={colors.muted} />
      <Circle cx="46" cy="34" r="5" fill={colors.text} />
      <Circle cx="46" cy="34" r="2" fill={colors.muted} />
    </Svg>
  );
}
