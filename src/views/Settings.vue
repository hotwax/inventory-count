<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.userFullName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ "Reset password") }}</ion-button> -->
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ translate("OMS") }}</h1>
      </div>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t('OMS instance') }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ oms }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>
          <ion-button :disabled="!omsRedirectionInfo.token || !omsRedirectionInfo.url" @click="goToOms(omsRedirectionInfo.token, omsRedirectionInfo.url)" fill="clear">
            {{ $t('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
        <ion-card v-if="hasPermission('APP_COUNT_VIEW') && router.currentRoute.value.fullPath.includes('/tabs/')">
          <ion-card-header>
            <ion-card-title>
              {{ $t("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t("Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="$t('Select facility')" interface="popover" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName || facility.facilityId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card v-if="hasPermission('APP_DRAFT_VIEW') && !router.currentRoute.value.fullPath.includes('/tabs/')">
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("A store repesents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select store')" interface="popover" :value="currentProductStore.productStoreId" @ionChange="setProductStore($event)">
              <ion-select-option v-for="store in productStores" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName || store.productStoreId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Product Identifier') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ translate('Choosing a product identifier allows you to view products with your preferred identifiers.') }}
          </ion-card-content>

          <ion-item>
            <ion-select :label="translate('Primary Product Identifier')" :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE) || !currentFacility?.productStore?.productStoreId" interface="popover" :placeholder="translate('primary identifier')" :value="productStoreSettings['productIdentificationPref'].primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
              <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select :label="translate('Secondary Product Identifier')" :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE) || !currentFacility?.productStore?.productStoreId" interface="popover" :placeholder="translate('secondary identifier')" :value="productStoreSettings['productIdentificationPref'].secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
              <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
              <ion-select-option value="">{{ translate("None") }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />
      <div class="section-header">
        <h1>
          {{ translate("App") }}
          <p class="overline">{{ translate("Version:") + appVersion }}</p>
        </h1>
        <p class="overline">{{ translate("Built:") + getDateTime(appInfo.builtTime) }}</p>
      </div>
      <!-- <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Timezone") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("The timezone you select is used to ensure automations you schedule are always accurate to the time you select.") }}
          </ion-card-content> -->
          <!-- <ion-item lines="none">
            <ion-label>{{ userProfile && userProfile.timeZone ? userProfile.timeZone : "-" }}</ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item> -->
        <!-- </ion-card>
      </section> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import Image from "@/components/Image.vue"
import { translate } from "@/i18n"
import { openOutline } from "ionicons/icons"
import { goToOms } from "@hotwax/dxp-components";
import { Actions, hasPermission } from "@/authorization"
import router from "@/router";
import { DateTime } from "luxon";

const store = useStore()
const appVersion = ref("")
const appInfo = (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any

const productIdentifications = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(process.env.VUE_APP_PRDT_IDENT) : []

const userProfile = computed(() => store.getters["user/getUserProfile"])
const oms = computed(() => store.getters["user/getInstanceUrl"])
const omsRedirectionInfo = computed(() => store.getters["user/getOmsRedirectionInfo"])
const facilities = computed(() => store.getters["user/getFacilities"])
const currentFacility = computed(() => store.getters["user/getCurrentFacility"])
const currentProductStore = computed(() => store.getters["user/getCurrentProductStore"])
const productStores = computed(() => store.getters["user/getProductStores"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

onMounted(() => {
  appVersion.value = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
})

function logout() {
  store.dispatch("user/logout").then(() => {
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
  })
}

function goToLaunchpad() {
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
}

async function setFacility(event: CustomEvent) {
  const facilityId = event.detail.value
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId)
  await store.dispatch("user/updateCurrentFacility", facility)
}

async function setProductStore(event: any) {
  const productStoreId = event.detail.value
  const productStore = productStores.value.find((store: any) => store.productStoreId === productStoreId)
  await store.dispatch("user/updateCurrentProductStore", productStore)
}

function setProductIdentificationPref(value: string, id: string) {
  store.dispatch("user/setProductStoreSetting", { key: "productIdentificationPref", value: {
    ...productStoreSettings.value["productIdentificationPref"],
    [id]: value
  }})
}

function getDateTime(time: any) {
  return time ? DateTime.fromMillis(time).toLocaleString({ ...DateTime.DATETIME_MED, hourCycle: "h12" }) : "";
}
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--border-medium);
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
</style>
