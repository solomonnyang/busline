import React from 'react';
import {
  RoutePlanningIllustration,
  TravelBookingIllustration,
  TravelersIllustration,
} from './vectors';

type Variant = 'map' | 'booking' | 'travel';

interface Props {
  variant: Variant;
  size?: number;
}

const RATIOS: Record<Variant, number> = {
  map: 538.104 / 960,
  booking: 529.322 / 800,
  travel: 659.247 / 923,
};

const ILLUSTRATIONS: Record<Variant, React.ComponentType<{ width: number; height: number }>> = {
  map: RoutePlanningIllustration,
  booking: TravelBookingIllustration,
  travel: TravelersIllustration,
};

export function OnboardingIllustration({ variant, size = 300 }: Props) {
  const Illustration = ILLUSTRATIONS[variant];
  return <Illustration width={size} height={Math.round(size * RATIOS[variant])} />;
}

export { RoutePlanningIllustration, TravelBookingIllustration, TravelersIllustration };