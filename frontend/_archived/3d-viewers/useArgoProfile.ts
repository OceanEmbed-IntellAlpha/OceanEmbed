import { useQuery } from '@tanstack/react-query';

export interface ProfileResponse {
  floatId: string;
  lat: number;
  lon: number;
  lastSurfaced: string;
  qcStatus: string;
  depths: number[];
  temperature: number[];
  salinity: number[];
  qc: string[];
}

const FALLBACK_PROFILE: ProfileResponse = {
  floatId: 'WMO6902913',
  lat: 12.4,
  lon: 78.3,
  lastSurfaced: '2026-07-31T09:12:00Z',
  qcStatus: 'ACCEPTED',
  depths: [0, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000, 1200, 1400, 1600, 1800, 2000],
  temperature: [29.8, 29.6, 29.4, 29.1, 28.5, 27.2, 25.8, 24.1, 22.3, 19.5, 17.2, 15.3, 12.8, 11.2, 10.1, 9.3, 8.7, 7.8, 7.1, 6.2, 5.1, 4.1, 3.2],
  salinity: [33.1, 33.2, 33.2, 33.3, 33.5, 34.0, 34.5, 34.9, 35.1, 35.3, 35.4, 35.4, 35.3, 35.2, 35.1, 35.0, 34.9, 34.8, 34.8, 34.7, 34.7, 34.7, 34.7],
  qc: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
};

export function useArgoProfile(floatId: string) {
  return useQuery<ProfileResponse>({
    queryKey: ['argo-profile', floatId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/profile/${floatId}`);
        if (!res.ok) {
          return { ...FALLBACK_PROFILE, floatId };
        }
        return await res.json();
      } catch {
        return { ...FALLBACK_PROFILE, floatId };
      }
    },
    initialData: { ...FALLBACK_PROFILE, floatId },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
