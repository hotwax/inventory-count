import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { DateTime } from 'luxon';


import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import './theme/variables.css';
import '@hotwax/apps-theme';

/* vue virtual scroller css */
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import i18n from './i18n'
import store from './store'
import permissionPlugin, { Actions, hasPermission } from '@/authorization';
import permissionRules from '@/authorization/Rules';
import permissionActions from '@/authorization/Actions';
import { dxpComponents } from '@hotwax/dxp-components'
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { login, logout, loader } from './user-utils';
import { fetchGoodIdentificationTypes, getConfig, getAvailableTimeZones, getEComStores, getEComStoresByFacility, getUserFacilities, getProductIdentificationPref, getUserPreference, initialise, setProductIdentificationPref, setUserTimeZone, setUserPreference } from '@/adapter';
import localeMessages from './locales';
import { db } from '@/database/commonDatabase'
import { initDeviceId } from '@/utils/device'
import { useProductMaster } from './composables/useProductMaster';
import { useProductStoreSettings } from './composables/useProductStoreSettings';
import { useInventoryCountRun } from './composables/useInventoryCountRun';

const app = createApp(App)
  .use(IonicVue, {
    mode: 'md',
    innerHTMLTemplatesEnabled: true
  })
  .use(router)
  .use(i18n)
  .use(store)
  .use(permissionPlugin, {
    rules: permissionRules,
    actions: permissionActions
  })
  .use(createPinia().use(piniaPluginPersistedstate))
  .use(dxpComponents, {
    Actions,
    defaultImgUrl: require("@/assets/images/defaultImage.png"),
    login,
    logout,
    loader,
    appLoginUrl: process.env.VUE_APP_LOGIN_URL as string,
    fetchGoodIdentificationTypes,
    getAvailableTimeZones,
    getConfig,
    getEComStores,
    getEComStoresByFacility,
    getProductIdentificationPref,
    getUserFacilities,
    getUserPreference,
    hasPermission,
    initialise,
    localeMessages,
    setProductIdentificationPref,
    setUserPreference,
    setUserTimeZone
  });

// Filters are removed in Vue 3 and global filter introduced https://v3.vuejs.org/guide/migration/filters.html#global-filters
app.config.globalProperties.$filters = {
  formatDate(value: any, inFormat?: any, outFormat?: string) {
    if(inFormat){
      return DateTime.fromFormat(value, inFormat).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
    }
    return DateTime.fromISO(value).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
  },
  formatUtcDate(value: any, inFormat?: any, outFormat?: string) {
    // TODO Make default format configurable and from environment variables
    const userProfile = store.getters['user/getUserProfile'];
    // TODO Fix this setDefault should set the default timezone instead of getting it everytiem and setting the tz
    return DateTime.fromISO(value, { zone: 'utc' }).setZone(userProfile.userTimeZone).toFormat(outFormat ? outFormat : 'MM-dd-yyyy')  
  },
  getFeature(featureHierarchy: any, featureKey: string) {
    let  featureValue = ''
    if (featureHierarchy) {
      const feature = featureHierarchy.find((featureItem: any) => featureItem.startsWith(featureKey))
      const featureSplit = feature ? feature.split('/') : [];
      featureValue = featureSplit[2] ? featureSplit[2] : '';
    }
    return featureValue;
  }
}


router.isReady().then(async () => {
  try {
    // Ensures the database is opened and schema initialized
    await db.open()
    await initDeviceId()
    await useProductMaster().init();
   // await useProductStoreSettings().init();
   // await useInventoryCountRun().loadStatusDescription();
  } catch (error) {
    console.error('[IndexedDB] Failed to open CommonDB:', error)
  }
  app.mount('#app');
});