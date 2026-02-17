export const analyticsService = {
    initialize: async () => { },
    trackEvent: async (event: string, params?: any) => { console.log(`[Analytics] ${event}`, params); },
};
