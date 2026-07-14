import { create } from 'zustand';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import i18next from 'i18next';

export type AppLanguage = 'en' | 'ar';

const LANG_KEY = 'ehdy_language';

interface LanguageState {
  language: AppLanguage;
  isRTL: boolean;
  /** Incremented when language changes to remount the navigator tree. */
  appKey: number;
  loadLanguage: () => Promise<void>;
  setLanguage: (lang: AppLanguage) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  isRTL: false,
  appKey: 0,

  loadLanguage: async () => {
    try {
      const saved = (await SecureStore.getItemAsync(LANG_KEY)) as AppLanguage | null;
      // Always reconcile store + i18next + RTL to one effective language.
      // i18next boots from the device locale while this store defaults to
      // 'en', so skipping the saved === store case leaves them disagreeing
      // (e.g. saved 'en' on an Arabic device kept rendering Arabic).
      const deviceLang: AppLanguage =
        Localization.getLocales?.()?.[0]?.languageCode === 'ar' ? 'ar' : 'en';
      const effective = saved ?? deviceLang;
      const isRTL = effective === 'ar';
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRTL);
      if (i18next.language !== effective) await i18next.changeLanguage(effective);
      set({ language: effective, isRTL });
    } catch {
      // Corrupted storage — leave default
    }
  },

  setLanguage: async (lang) => {
    if (lang === get().language) return;
    const isRTL = lang === 'ar';

    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL);
    await i18next.changeLanguage(lang);
    await SecureStore.setItemAsync(LANG_KEY, lang);

    // Bump appKey to remount the navigator so all screens re-render with the new language.
    // The direction: style on the root View handles RTL layout immediately.
    set({ language: lang, isRTL, appKey: get().appKey + 1 });
  },
}));
