// Only public, ship-safe values. Provider and Pinecone keys live in Supabase
// Edge Function secrets and are never bundled into the app.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  admobBannerIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? '',
  admobBannerAndroid: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? '',
};

export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
