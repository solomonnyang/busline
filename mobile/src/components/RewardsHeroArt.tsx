import React from 'react';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import { useTheme } from '../theme';

interface Props {
  size?: number;
}

export function RewardsHeroArt({ size = 200 }: Props) {
  const { colors } = useTheme();
  const primary = colors.primary;
  const gold = colors.gold;
  const ink = colors.ink;
  const white = colors.white;
  const surface = colors.surface;

  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
      <Ellipse cx="100" cy="120" rx="72" ry="8" fill={ink} opacity="0.08" />

      <Sparkle x={22} y={18} size={5} color={colors.accentBlue} />
      <Sparkle x={12} y={88} size={4} color={colors.accentPurple} />
      <Sparkle x={190} y={42} size={4} color={colors.accentPink} />
      <Sparkle x={150} y={14} size={4} color={colors.success} />

      <Rect x="158" y="20" width="30" height="24" rx="5" fill={gold} />
      <Rect x="169" y="20" width="8" height="24" fill={white} opacity="0.9" />
      <Circle cx="173" cy="20" r="4.5" fill={white} />
      <Circle cx="166" cy="15" r="4" fill={white} opacity="0.75" />
      <Circle cx="180" cy="15" r="4" fill={white} opacity="0.75" />

      <Circle cx="28" cy="34" r="13" fill={gold} />
      <Star5 color={white} />

      <Rect x="30" y="50" width="140" height="56" rx="16" fill={primary} />
      <Rect x="30" y="50" width="140" height="14" rx="7" fill={white} opacity="0.18" />

      <Rect x="46" y="74" width="30" height="18" rx="5" fill={white} opacity="0.3" />
      <Passenger cx={61} shirt={gold} />
      <Rect x="85" y="74" width="30" height="18" rx="5" fill={white} opacity="0.3" />
      <Passenger cx={100} shirt={colors.accentPink} />
      <Rect x="124" y="74" width="30" height="18" rx="5" fill={white} opacity="0.3" />
      <Passenger cx={139} shirt={colors.accentBlue} />

      <Circle cx="164" cy="92" r="5" fill={white} opacity="0.85" />
      <Rect x="162" y="84" width="5" height="9" rx="2" fill={gold} />

      <Circle cx="60" cy="112" r="12" fill={ink} />
      <Circle cx="60" cy="112" r="5" fill={surface} />
      <Circle cx="140" cy="112" r="12" fill={ink} />
      <Circle cx="140" cy="112" r="5" fill={surface} />

      <Person x={182} groundY={112} primary={primary} ink={ink} />
    </Svg>
  );
}

function Passenger({ cx, shirt }: { cx: number; shirt: string }) {
  return (
    <>
      <Path d={`M ${cx - 7} 84 A 7 5.5 0 0 1 ${cx + 7} 84 Z`} fill={shirt} />
      <Circle cx={cx} cy={78} r="5.5" fill="#2B1F19" opacity="0.55" />
    </>
  );
}

function Person({ x, groundY, primary, ink }: { x: number; groundY: number; primary: string; ink: string }) {
  return (
    <>
      <Circle cx={x} cy={groundY - 26} r="6" fill="#2B1F19" opacity="0.5" />
      <Path
        d={`M ${x - 9} ${groundY - 8} Q ${x} ${groundY - 16} ${x + 9} ${groundY - 8} L ${x + 8} ${groundY - 1} L ${x - 8} ${groundY - 1} Z`}
        fill={primary}
      />
      <Rect x={x - 5} y={groundY - 2} width="3.5" height="11" rx="1.6" fill={ink} opacity="0.5" />
      <Rect x={x + 1.5} y={groundY - 2} width="3.5" height="11" rx="1.6" fill={ink} opacity="0.5" />
    </>
  );
}

function Sparkle({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const h = size;
  const v = size * 1.4;
  return (
    <Polygon
      points={`${x},${y - v} ${x + h},${y - h} ${x + v},${y} ${x + h},${y + h} ${x},${y + v} ${x - h},${y + h} ${x - v},${y} ${x - h},${y - h}`}
      fill={color}
    />
  );
}

function Star5({ color }: { color: string }) {
  return (
    <Polygon
      points="26,24 27.41,28.06 31.71,28.15 28.28,30.74 29.53,34.85 26,32.4 22.47,34.85 23.72,30.74 20.29,28.15 24.59,28.06"
      fill={color}
    />
  );
}
