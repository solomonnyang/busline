import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { MapPoint } from '../components/LeafletMapWebView';

export function useDeviceLocation() {
  const [coords, setCoords] = useState<MapPoint | null>(null);
  const [permission, setPermission] = useState(false);

  const locate = useCallback(async (): Promise<MapPoint | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status === 'granted');
      if (status !== 'granted') return null;

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const quick: MapPoint = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setCoords(quick);
        void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then((pos) => {
            const refined: MapPoint = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setCoords(refined);
          })
          .catch(() => {});
        return quick;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: MapPoint = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCoords(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void locate();
  }, [locate]);

  return { coords, permission, locate };
}
