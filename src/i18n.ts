import { createI18n } from 'vue-i18n'

/**
 * Load locale messages
 * 
 * The loaded `JSON` locale messages is pre-compiled by `@intlify/vue-i18n-loader`, which is integrated into `vue-cli-plugin-i18n`.
 * See: https://github.com/intlify/vue-i18n-loader#rocket-i18n-resource-pre-compilation
 */
function loadLocaleMessages(): Record<string, Record<string, string>> {
  const locales = require.context('./locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
  const messages: Record<string, Record<string, string>> = {}
  locales.keys().forEach(key => {
    const matched = key.match(/([A-Za-z0-9-_]+)\./i)
    if (matched && matched.length > 1) {
      const locale = matched[1]
      messages[locale] = locales(key)
    }
  })
  return messages
}

const i18n = createI18n({
  locale: process.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages() as Record<string, Record<string, string>>
})

// TODO Check if this is needed in updated versions
// Currently this method is added to be used in ts files
const translate = (key: string, named?: any) => {
  if (!key) {
    return '';
  }
  return i18n.global.t(key, named);
};

export { i18n as default, translate }