import { apiRequest } from './http';

export type Plan = 'free' | 'pro';

export interface BillingState {
  plan: Plan;
  subscription_status: string | null;
  current_period_end: string | null;
  has_customer: boolean;
}

export function getBilling(): Promise<BillingState> {
  return apiRequest<BillingState>('/billing');
}

export function createCheckoutSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/billing/checkout', { method: 'POST' });
}

export function createPortalSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/billing/portal', { method: 'POST' });
}
