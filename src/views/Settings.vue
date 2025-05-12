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
        <DxpFacilitySwitcher v-if="hasPermission('APP_COUNT_VIEW') && router.currentRoute.value.fullPath.includes('/tabs/')" @updateFacility="setFacility($event)"/>
        <DxpProductStoreSelector v-if="hasPermission('APP_DRAFT_VIEW') && !router.currentRoute.value.fullPath.includes('/tabs/')" @updateEComStore="setProductStore($event)" />
      </section>
      <hr />
      <div class="section-header">
        <h1>
          {{ translate("App") }}
          <p class="overline">{{ translate("Version:") + appVersion }}</p>
        </h1>
        <p class="overline">{{ translate("Built:") + getDateTime(appInfo.builtTime) }}</p>
      </div>
      <section>
        <!-- <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Timezone") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("The timezone you select is used to ensure automations you schedule are always accurate to the time you select.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ userProfile && userProfile.timeZone ? userProfile.timeZone : "-" }}</ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item>
        </ion-card> -->

        <DxpProductIdentifier />
        <!-- render the ForceScanCard component only if the current route path includes '/tabs/'(Store view) -->
        <ForceScanCard v-if="router.currentRoute.value.fullPath.includes('/tabs/')"/>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Scrolling animation") }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ translate("Enable the scrolling animation on the hard count's detail page.") }}
          </ion-card-content>

          <ion-item lines="none">
            <ion-toggle label-placement="start" v-model="isScrollingAnimationEnabled" @click.prevent="updateScrollingAnimationPreference($event)">{{ translate("Enable animation") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonToggle } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import Image from "@/components/Image.vue"
import { translate } from "@/i18n"
import { openOutline } from "ionicons/icons"
import { goToOms } from "@hotwax/dxp-components";
import { Actions, hasPermission } from "@/authorization"
import router from "@/router";
import { DateTime } from "luxon";
import ForceScanCard from "@/components/ForceScanCard.vue";

const store = useStore()
const appVersion = ref("")
const appInfo = (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any

const userProfile = computed(() => store.getters["user/getUserProfile"])
const oms = computed(() => store.getters["user/getInstanceUrl"])
const omsRedirectionInfo = computed(() => store.getters["user/getOmsRedirectionInfo"])
const isScrollingAnimationEnabled = computed(() => store.getters["user/isScrollingAnimationEnabled"])

onMounted(async () => {
  appVersion.value = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
  await store.dispatch("user/getProductStoreSetting")
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

async function setFacility(facility: any) {
  await store.dispatch("user/updateCurrentFacility", facility)
}

async function setProductStore(selectedProductStore: any) {
  await store.dispatch("user/updateCurrentProductStore", selectedProductStore)
}

function updateScrollingAnimationPreference(event: any) {
  event.stopImmediatePropagation();

  store.dispatch("user/updateScrollingAnimationPreference", !isScrollingAnimationEnabled.value)
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
