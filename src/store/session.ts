import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isBackendConfigured } from '../lib/env';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'pro';

interface SessionState {
  session: Session | null;
  /** Pro if either the store (RevenueCat) or the server profile grants it. */
  plan: Plan;
  storePro: boolean;
  serverPro: boolean;
  setSession: (session: Session | null) => void;
  setEntitlement: (source: 'store' | 'server', pro: boolean) => void;
}

export const useSession = create<SessionState>()((set, get) => ({
  session: null,
  plan: 'free',
  storePro: false,
  serverPro: false,
  setSession: (session) => set({ session }),
  setEntitlement: (source, pro) => {
    const next = { storePro: get().storePro, serverPro: get().serverPro, [`${source}Pro`]: pro };
    set({ ...next, plan: next.storePro || next.serverPro ? 'pro' : 'free' });
  },
}));

export const isSignedIn = () => !!useSession.getState().session;
export const isPro = () => useSession.getState().plan === 'pro';

/** Restores the saved session and keeps the store in sync with auth events. */
export async function initSession(onSignedIn: (userId: string) => void): Promise<void> {
  if (!isBackendConfigured) return;
  const { data } = await supabase.auth.getSession();
  useSession.getState().setSession(data.session);
  if (data.session) onSignedIn(data.session.user.id);
  supabase.auth.onAuthStateChange((event, session) => {
    useSession.getState().setSession(session);
    if (event === 'SIGNED_IN' && session) onSignedIn(session.user.id);
  });
}
