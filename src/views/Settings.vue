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
              <!-- <Image :src="userProfile.partyImageUrl"/> -->
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
          <ion-button :standalone-hidden="!hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- TODO: Replace route-based checks with a store/admin view flag when present in Pinia Stores -->
          <ion-button fill="outline" v-if="hasPermission(Actions.APP_ASSIGNED_VIEW) && router.currentRoute.value.fullPath.includes('/tabs/')" :router-link="'/assigned'">
            <ion-icon size="medium" :icon="shieldCheckmarkOutline" slot="start"></ion-icon>
            {{ translate("Admin View") }}
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
              {{ translate('OMS instance') }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ oms }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>
          <ion-button :disabled="!useAuthStore().token.value || !omsUrl || !hasPermission(Actions.APP_COMMERCE_VIEW)" @click="goToOms(useAuthStore().token.value, omsUrl)" fill="clear">
            {{ translate('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
        <FacilitySwitcher v-if="hasPermission('APP_COUNT_VIEW') && router.currentRoute.value.fullPath.includes('/tabs/')"/>
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
            {{ translate('A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores selling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.') }}
          </ion-card-content>

          <ion-item lines="none">
            <ion-select :label="translate('Select store')" interface="popover" :placeholder="translate('store name')" :value="currentEComStore?.productStoreId" @ionChange="updateEComStore($event.target.value)">
              <ion-select-option v-for="store in (eComStores ? eComStores : [])" :key="store.productStoreId" :value="store.productStoreId">{{ store.storeName }}</ion-select-option>
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
      <section>
        <TimeZoneSwitcher/>
        <ion-card v-if="!router.currentRoute.value.fullPath.includes('/tabs/')">
          <ion-card-header>
            <ion-card-title>
              {{ 'Product Identifier' }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ 'Choosing a product identifier allows you to view products with your preferred identifiers.' }}
          </ion-card-content>

          <ion-item :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
            <ion-select :label="translate('Primary')" interface="popover" :placeholder="'primary identifier'" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
              <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId">{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
            <ion-select :label="translate('Secondary')" interface="popover" :placeholder="'secondary identifier'" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
              <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
              <!-- <ion-select-option value="">{{ "None" }}</ion-select-option> -->
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Force scan') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="useProductStore().getBarcodeIdentificationPref || translate('Select')" :value="useProductStore().getBarcodeIdentificationPref" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in productIdentifications" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Scanner pairing guide') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Quick steps to put Socket Mobile S7xx scanners in iOS Basic Keyboard (HID) mode and pair to your iPad.') }}
          </ion-card-content>
          <ion-button id="pairing-guide-modal" fill="outline" expand="block">
            <ion-icon slot="start" :icon="bluetoothOutline" />
            {{ translate('Pairing guide') }}
          </ion-button>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Diagnostics") }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <p>{{ translate("Run diagnostics to validate your device is correctly configured.") }}</p>
            <p>{{ translate("Clear local inventory data to remove cached products, identifications, count records, and scans from this device.") }}</p>
          </ion-card-content>
          <ion-button expand="block" @click="openDiagnosisModal" fill="outline">
            <ion-icon :icon="medicalOutline" slot="start"></ion-icon>
            <ion-label>{{ translate("Run diagnostics") }}</ion-label>
          </ion-button>
          <ion-button expand="block" @click="confirmClearLocalInventoryData" fill="outline" color="danger">
            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
            <ion-label>{{ translate("Clear local inventory data") }}</ion-label>
          </ion-button>
        </ion-card>
      </section>

      <ion-modal ref="pairingGuideModal" trigger="pairing-guide-modal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closePairingGuide">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate('Pair the scanner') }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="overline">Socket Mobile S700 / S720 / S730 / S740</p>
          <p>{{ translate('Follow these steps to get Basic Keyboard (HID) mode and pair with your iPad.') }}</p>
          <ol>
            <li class="guide-step">
              <h3>{{ translate('Reset/Unpair (if switching devices)') }}</h3>
              <p>{{ translate('Turn the scanner on, then scan this barcode to clear old pairing info. The scanner will turn off after the reset.') }}</p>
              <ion-img class="barcode-img" :src="pairingResetBarcode" alt="Pairing reset barcode" />
            </li>
            <li class="guide-step">
              <h3>{{ translate('Set iOS Basic Keyboard Mode') }}</h3>
              <p>{{ translate('Power the scanner back on, make sure the blue light is blinking fast, then scan this barcode to put it in HID keyboard mode (acts like a keyboard).') }}</p>
              <ion-img class="barcode-img" :src="iosKeyboardBarcode" alt="iOS Basic Keyboard Mode barcode" />
            </li>
            <li class="guide-step">
              <h3>{{ translate('Pair in iPad Bluetooth') }}</h3>
              <p>{{ translate('On the iPad: Settings → Bluetooth → tap the scanner (shows as S7XX [xxxxxx]) → Pair. You should hear one beep when connected.') }}</p>
            </li>
            <li class="guide-step">
              <h3>{{ translate('Test in the app') }}</h3>
              <p>{{ translate('Place the cursor in any input field and scan a barcode. You should see the value appear like typed text.') }}</p>
            </li>
          </ol>
          <ion-note color="medium">{{ translate('Tip: If you change devices or modes later, repeat the reset and keyboard steps first.') }}</ion-note>
        </ion-content>
      </ion-modal>
    </ion-content>
    <ion-modal :is-open="isDiagnosisOpen" @did-dismiss="isDiagnosisOpen = false">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="isDiagnosisOpen = false">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Diagnosis</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item v-for="test in diagnosisResults" :key="test.name" lines="full">
          <ion-label>
            {{ test.name }}
            <p v-if="test.detail">{{ test.detail }}</p>
          </ion-label>

          <ion-badge :color="test.status === 'passed' ? 'success' : test.status === 'failed' ? 'danger' : 'medium'" slot="end">
            {{ test.status }}
          </ion-badge>
        </ion-item>
        <ion-item-divider color="light">
          {{ translate('OMS diagnosis') }}
        </ion-item-divider>
        <ion-item v-for="test in omsDiagnosticsResults" :key="test.name" lines="full">
          <ion-label>
            {{ test.name }}
            <p v-if="test.detail">{{ test.detail }}</p>
          </ion-label>
          <ion-badge :color="test.status === 'passed' ? 'success' : test.status === 'failed' ? 'danger' : 'medium'" slot="end">
            {{ test.status }}
          </ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonImg, IonItem, IonItemDivider, IonLabel, IonList, IonMenuButton, IonModal, IonNote, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, alertController } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { translate } from "@common"
import { bluetoothOutline, closeOutline, medicalOutline, openOutline, shieldCheckmarkOutline, trashOutline } from "ionicons/icons"
import { useAuthStore } from "@/stores/authStore";
import { Actions, hasPermission } from "@/authorization"
import router from "@/router";
import { DateTime } from "luxon";
import FacilitySwitcher from "@/components/FacilitySwitcher.vue";
import { useUserProfile } from "@/stores/userProfileStore";
import { useProductStore } from "@/stores/productStore";
import TimeZoneSwitcher from "@/components/TimeZoneSwitcher.vue"
import pairingResetBarcode from "@/assets/images/pairing-reset.png"
import iosKeyboardBarcode from "@/assets/images/ios-keyboard.png"
import { useDiagnostics } from "@/composables/useDiagnostics";
import { showToast } from "@/services/uiUtils";
import { db } from "@/services/appInitializer";

const appVersion = ref("")
const appInfo = (import.meta.env.VITE_VERSION_INFO ? JSON.parse(import.meta.env.VITE_VERSION_INFO) : {}) as any

const userProfile = computed(() => useUserProfile().getUserProfile);
const oms = useAuthStore().oms
const omsUrl = computed(() => useAuthStore().getOmsUrl);
const eComStores = computed(() => useProductStore().getProductStores) as any;
const currentEComStore = computed(() => useProductStore().getCurrentProductStore);
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const productIdentificationOptions = computed(() => useProductStore().getProductIdentificationOptions);

onMounted(async () => {
  appVersion.value = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
  await useProductStore().getSettings(useProductStore().getCurrentProductStore.productStoreId)
  await useProductStore().prepareProductIdentifierOptions();
  await useProductStore().getDxpIdentificationPref(currentEComStore.value.productStoreId);
})

function logout() {
  useAuthStore().logout();
}

function goToLaunchpad() {
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}`
}

function getDateTime(time: any) {
  return time ? DateTime.fromMillis(time).toLocaleString({ ...DateTime.DATETIME_MED, hourCycle: "h12" }) : "";
}

const goToOms = (token: string, oms: string) => {
  const link = (oms.startsWith('http') ? oms.replace(/\/api\/?|\/$/, "") : `https://${oms}.hotwax.io`) + `/commerce/control/main?token=${token}`
  
  window.open(link, '_blank', 'noopener, noreferrer')
}

/* Force Scan Card Logic */

const barcodeContentMessage = translate("Require inventory to be scanned when counting instead of manually entering values. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
const productIdentifications = computed(() => useProductStore().getGoodIdentificationOptions) as any

function setBarcodeIdentificationPref(value: any) {
  useProductStore().setProductStoreSetting("barcodeIdentificationPref", value, useProductStore().getCurrentProductStore.productStoreId);
}

async function updateEComStore(eComStoreId: any) {
  const selectedProductStore = eComStores.value.find((store: any) => store.productStoreId == eComStoreId)
  await useProductStore().setEComStorePreference(selectedProductStore)
}

function setProductIdentificationPref(value: string | any, id: string) {
  useProductStore().setDxpProductIdentificationPref(id, value, currentEComStore.value.productStoreId)
}

/* Pairing guide modal */
const pairingGuideModal = ref();
const closePairingGuide = () => pairingGuideModal.value?.$el?.dismiss();

// Diagnostics code
const isDiagnosisOpen = ref(false) as any;
const diagnosisResults = ref([]) as any;
const omsDiagnosticsResults = ref([]) as any;

const { baseDiagnosticsList, omsDiagnosticsList, runDiagnostics } = useDiagnostics();

async function openDiagnosisModal() {
  isDiagnosisOpen.value = true;

  diagnosisResults.value = baseDiagnosticsList.map(name => ({
    name,
    status: "testing",
    detail: ""
  }));

  omsDiagnosticsResults.value = omsDiagnosticsList.map(name => ({
    name,
    status: "testing",
    detail: ""
  }));

  // Step 2: Run diagnostics
  const finalResults = await runDiagnostics();

  // Step 3: animate updates one by one
  finalResults.localResults.forEach((result, index) => {
    setTimeout(() => {
      diagnosisResults.value[index] = result;
    }, index * 150);
  });
  finalResults.omsDiagnosticsResults.forEach((result, index) => {
    setTimeout(() => {
      omsDiagnosticsResults.value[index] = result;
    }, index * 150);
  });
}

async function confirmClearLocalInventoryData() {
  const alert = await alertController.create({
    header: translate("Clear local inventory data"),
    message: translate("This will remove products, product identifications, scan events, and inventory count records from this device. This cannot be undone."),
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
      },
      {
        text: translate("Clear data"),
        handler: async () => {
          if (!db) {
            showToast(translate("Local database is not initialized."));
            return;
          }

          try {
            await db.transaction("rw", db.inventoryCountRecords, db.productIdentification, db.products, db.productInventory, async () => {
              await Promise.all([
                db.inventoryCountRecords.clear(),
                db.productIdentification.clear(),
                db.products.clear(),
                db.productInventory.clear(),
              ]);
            });
            await db.transaction("rw", db.scanEvents, async () => {
              await db.scanEvents.clear();
            });
            showToast(translate("Local inventory data cleared."));
          } catch (error) {
            console.error("Failed to clear local inventory data:", error);
            showToast(translate("Failed to clear local inventory data."));
          }
        }
      }
    ]
  });

  await alert.present();
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

  li.guide-step::marker {
    font-size: 1.375rem;
  }

  .barcode-img {
    display: block;
    max-width: 260px;
    margin: var(--spacer-2xs) auto;
    border: 1px solid var(--border-medium);
    border-radius: 8px;
    padding: var(--spacer-2xs);
    background: var(--ion-color-light);
  }
</style>
