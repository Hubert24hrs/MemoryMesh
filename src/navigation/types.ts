import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Notes: undefined;
  Search: { tagId?: string; tagName?: string } | undefined;
  Chat: undefined;
  Capture: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  Editor: { noteId: string };
  Collections: undefined;
  Collection: { id: string; name: string };
  Insights: undefined;
  Settings: undefined;
  Paywall: undefined;
  SignIn: undefined;
};

export type RootScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
