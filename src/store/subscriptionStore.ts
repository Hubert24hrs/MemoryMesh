import { create } from 'zustand';

interface SubscriptionState {
    isPro: boolean;
    initialize: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
    isPro: true, // Mock pro status
    initialize: async () => { },
}));
