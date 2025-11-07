import { createI18n } from 'vue-i18n';

/**
 * Load locale messages
 */
function loadLocaleMessages(): Record<string, Record<string, string>> {
  const locales = require.context('./locales', true, /[A-Za-z0-9-_,\s]+\.json$/i);
  const messages: Record<string, Record<string, string>> = {};

  locales.keys().forEach((key) => {
    const matched = key.match(/([A-Za-z0-9-_]+)\./i);
    if (matched && matched.length > 1) {
      const locale = matched[1];
      messages[locale] = locales(key);
    }
  });

  return messages;
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: process.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages(),
});

export default i18n;

/**
 * Simple translate helper for TS files
 */
export const translate = (key: string, named?: Record<string, unknown>): string => {
  if (!key) return '';
  return i18n.global.t(key, named as any);
};
