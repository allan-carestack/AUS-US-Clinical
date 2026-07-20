// Runtime configuration for the clinical API client.
//
// The prototype ships with `useMocks: true` so it runs fully offline against
// the in-memory fixtures in `mocks.ts`. To point it at the real
// carestack.clinical backend, set the Vite env vars below (e.g. in `.env.local`)
// and provide auth via `getAuthHeaders` in `client.ts`:
//
//   VITE_CLINICAL_API_URL=https://<host>/api
//   VITE_CLINICAL_USE_MOCKS=false
//
// The backend is an internal, authenticated .NET service — live calls also
// require network reachability (VPN) and CORS/allow-listing for this origin.

const env = import.meta.env as Record<string, string | undefined>;

export interface ApiConfig {
  baseUrl: string;
  useMocks: boolean;
  /** Simulated latency (ms) for mock responses, so loading states are exercised. */
  mockLatencyMs: number;
}

export const apiConfig: ApiConfig = {
  baseUrl: env.VITE_CLINICAL_API_URL ?? '/api',
  // Default to mocks unless explicitly disabled with VITE_CLINICAL_USE_MOCKS=false.
  useMocks: env.VITE_CLINICAL_USE_MOCKS !== 'false',
  mockLatencyMs: Number(env.VITE_CLINICAL_MOCK_LATENCY_MS ?? 250),
};

// The demo patient/provider/location the prototype charts against. In a real
// integration these come from the surrounding app shell / route context.
export interface ClinicalContext {
  patientId: number;
  providerId: number;
  locationId: number;
  accountId: number;
}

export const demoContext: ClinicalContext = {
  patientId: Number(env.VITE_CLINICAL_PATIENT_ID ?? 1001),
  providerId: Number(env.VITE_CLINICAL_PROVIDER_ID ?? 501),
  locationId: Number(env.VITE_CLINICAL_LOCATION_ID ?? 1),
  accountId: Number(env.VITE_CLINICAL_ACCOUNT_ID ?? 1),
};
