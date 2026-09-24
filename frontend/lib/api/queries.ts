import { useQuery } from '@tanstack/react-query';
import type {
  SurfaceVariable,
  SurfaceField,
  SubsurfaceProfile,
  ArgoProfile,
  ValidationMatchup,
  RegionalValidation,
  DatasetCard,
  ExperimentsResponse
} from './types';

// Force connection to the FastAPI backend directly to bypass the Next.js dev server which lacks API routes
export const BASE_URL = 'http://localhost:8000';

// ─── Surface Field Query ─────────────────────────────────────────────────────────────
export function useSurfaceField(params: { variable: SurfaceVariable; date: string } | null) {
  return useQuery<SurfaceField, Error>({
    queryKey: ['surface_field', params?.variable, params?.date],
    queryFn: async () => {
      if (!params) throw new Error("No params");
      const url = new URL(`${BASE_URL}/api/field`, window.location.href);
      url.searchParams.set('variable', params.variable);
      url.searchParams.set('date', params.date);
      // Hardcode bbox to Indian Ocean for performance
      url.searchParams.set('bbox', '45,-5,105,35');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Field fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}

// ─── Subsurface Profile Query ────────────────────────────────────────────────────────
export function useSubsurfaceProfile(params: { lat: number; lon: number; date: string } | null) {
  return useQuery<SubsurfaceProfile, Error>({
    queryKey: ['subsurface_profile', params?.lat, params?.lon, params?.date],
    queryFn: async () => {
      if (!params) throw new Error("No params");
      const res = await fetch(`${BASE_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Predict fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Nearby Argo Query ──────────────────────────────────────────────────────────────
export function useNearbyArgo(params: { lat: number; lon: number; date: string } | null) {
  return useQuery<ArgoProfile[], Error>({
    queryKey: ['nearby_argo', params?.lat, params?.lon, params?.date],
    queryFn: async () => {
      if (!params) throw new Error("No params");
      const url = new URL(`${BASE_URL}/api/argo/nearby`, window.location.href);
      url.searchParams.set('lat', params.lat.toString());
      url.searchParams.set('lon', params.lon.toString());
      url.searchParams.set('date', params.date);
      url.searchParams.set('radius_km', '200');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Nearby Argo fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Argo Profile Query ─────────────────────────────────────────────────────────────
export function useArgoProfile(floatId: string | null) {
  return useQuery<ArgoProfile, Error>({
    queryKey: ['argo_profile', floatId],
    queryFn: async () => {
      if (!floatId) throw new Error("No floatId");
      const res = await fetch(`${BASE_URL}/api/argo/profile/${encodeURIComponent(floatId)}`);
      if (!res.ok) throw new Error(`Argo profile fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!floatId,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Validation Matchup Query ────────────────────────────────────────────────────────
export function useValidationMatchup(params: { lat: number; lon: number; date: string } | null) {
  return useQuery<ValidationMatchup, Error>({
    queryKey: ['validation_matchup', params?.lat, params?.lon, params?.date],
    queryFn: async () => {
      if (!params) throw new Error("No params");
      const url = new URL(`${BASE_URL}/api/validation/matchup`, window.location.href);
      url.searchParams.set('lat', params.lat.toString());
      url.searchParams.set('lon', params.lon.toString());
      url.searchParams.set('date', params.date);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Validation matchup fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Regional Validation Query ───────────────────────────────────────────────────────
export function useRegionalValidation() {
  return useQuery<RegionalValidation[], Error>({
    queryKey: ['regional_validation'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/validation/regional`);
      if (!res.ok) throw new Error(`Regional validation fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ─── Datasets Query ────────────────────────────────────────────────────────────────
export function useDatasets() {
  return useQuery<DatasetCard[], Error>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/datasets`);
      if (!res.ok) throw new Error(`Datasets fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ─── Experiments Query ─────────────────────────────────────────────────────────────
export function useExperiments() {
  return useQuery<ExperimentsResponse, Error>({
    queryKey: ['experiments'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/experiments`);
      if (!res.ok) throw new Error(`Experiments fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

