import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import moment from 'moment'
import "moment-timezone";


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

import i18n from './i18n'
import store from './store'

const app = createApp(App)
  .use(IonicVue)
  .use(router)
  .use(i18n)
  .use(store);

// Filters are removed in Vue 3 and global filter introduced https://v3.vuejs.org/guide/migration/filters.html#global-filters
app.config.globalProperties.$filters = {
  formatDate(value: any, inFormat?: string, outFormat?: string) {
    // TODO Use Loxon instead
    // TODO Make default format configurable and from environment variables
    return moment(value, inFormat).format(outFormat ? outFormat : 'MM-DD-YYYY');
  },
  formatUtcDate(value: any, inFormat?: string, outFormat?: string) {
    // TODO Use Loxon instead
    // TODO Make default format configurable and from environment variables
    const userProfile = store.getters['user/getUserProfile'];
    // TODO Fix this setDefault should set the default timezone instead of getting it everytiem and setting the tz
    return moment.utc(value, inFormat).tz(userProfile.userTimeZone).format(outFormat ? outFormat : 'MM-DD-YYYY');
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


router.isReady().then(() => {
  app.mount('#app');
});