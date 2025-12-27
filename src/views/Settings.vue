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
          <ion-button :disabled="!useAuthStore().token.value || !omsRedirectionLink || !hasPermission(Actions.APP_COMMERCE_VIEW)" @click="goToOms(useAuthStore().token.value, omsRedirectionLink)" fill="clear">
            {{ $t('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
        <ion-card v-if="hasPermission('APP_COUNT_VIEW') && router.currentRoute.value.fullPath.includes('/tabs/')">
          <ion-card-header>
            <ion-card-title>
              {{ translate('Facility') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>
              {{ currentFacility.facilityName }}
              <p>{{ currentFacility.facilityId }}</p>
            </ion-label>
            <ion-button v-if="facilities?.length > 1" id="open-facility-modal" slot="end" fill="outline" color="dark">{{
              translate('Change')}}</ion-button>
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
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Timezone') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>
          <ion-item>
            <ion-label>
              <p class="overline">{{ translate("Browser TimeZone") }}</p>
              {{ browserTimeZone.id }}
              <p>{{ getCurrentTime(browserTimeZone.id, 't ZZZZ') }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ translate("Selected TimeZone") }}</p>
              {{ currentTimeZoneId }}
              <p>{{ getCurrentTime(currentTimeZoneId, 't ZZZZ') }}</p>
            </ion-label>
            <ion-button id="time-zone-modal" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item>
        </ion-card>
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
            <ion-select :label="$t('Primary')" interface="popover" :placeholder="'primary identifier'" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
              <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId">{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
            <ion-select :label="$t('Secondary')" interface="popover" :placeholder="'secondary identifier'" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
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
          </ion-card-content>
          <ion-button expand="block" @click="openDiagnosisModal" fill="outline">
            <ion-icon :icon="medicalOutline" slot="start"></ion-icon>
            <ion-label>{{ translate("Run diagnostics") }}</ion-label>
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
    <!-- Using inline modal(as recommended by ionic), also using it inline as the component inside modal is not getting mounted when using modalController -->
    <ion-modal ref="timeZoneModal" trigger="time-zone-modal" @didPresent="search()" @didDismiss="clearTimeZoneSearch()">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeTimeZoneModal">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Select time zone") }}</ion-title>
        </ion-toolbar>
        <ion-toolbar>
          <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search time zones')"  v-model="timeZoneQuery" @keyup.enter="timeZoneQuery = $event.target.value; findTimeZone()" @keydown="preventSpecialCharacters($event)" />
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <div>
          <ion-radio-group v-model="timeZoneId">
            <ion-list>
              <ion-list-header>{{ translate("Browser time zone") }}</ion-list-header>
              <ion-item>
                <ion-radio label-placement="end" justify="start" :value="browserTimeZone.id">
                  <ion-label>
                    {{ browserTimeZone.label }} ({{ browserTimeZone.id }})
                    <p>{{ getCurrentTime(browserTimeZone.id, 't ZZZZ') }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-list>
            <ion-list>
              <ion-list-header>{{ translate("Select a different time zone") }}</ion-list-header>
              <!-- Loading state -->
              <div class="empty-state" v-if="isTimeZoneLoading">
                <ion-item lines="none">
                  <ion-spinner color="secondary" name="crescent" slot="start" />
                  {{ translate("Fetching time zones") }}
                </ion-item>
              </div>
              <!-- Empty state -->
              <div class="empty-state" v-else-if="filteredTimeZones.length === 0">
                <p>{{ translate("No time zone found") }}</p>
              </div>
              <div v-else>
                <ion-item :key="timeZone.id" v-for="timeZone in filteredTimeZones">
                  <ion-radio label-placement="end" justify="start" :value="timeZone.id">
                    <ion-label>
                      {{ timeZone.label }} ({{ timeZone.id }})
                      <p>{{ getCurrentTime(timeZone.id, 't ZZZZ') }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </div>
            </ion-list>
          </ion-radio-group>
        </div>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button :disabled="!timeZoneId || timeZoneId === currentTimeZoneId" @click="setUserTimeZone">
            <ion-icon :icon="saveOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-modal>
  <!-- Using inline modal(as recommended by ionic), also using it inline as the component inside modal is not getting mounted when using modalController -->
    <ion-modal ref="facilityModal" trigger="open-facility-modal" @didPresent="loadFacilities()"
      @didDismiss="clearFacilitySearch()">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeFacilityModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Select Facility") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search facilities')"
          v-model="facilityQuery" @ionInput="findFacility($event)"
          @keydown="preventSpecialCharacters($event)" />
        <ion-radio-group v-model="selectedFacilityId">
          <ion-list>
            <!-- Loading state -->
            <div class="empty-state" v-if="isFacilityLoading">
              <ion-item lines="none">
                <ion-spinner color="secondary" name="crescent" slot="start" />
                {{ translate("Fetching facilities") }}
              </ion-item>
            </div>
            <!-- Empty state -->
            <div class="empty-state" v-else-if="!filteredFacilities.length">
              <p>{{ translate("No facilities found") }}</p>
            </div>
            <div v-else>
              <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId">
                <ion-radio label-placement="end" justify="start" :value="facility.facilityId">
                  <ion-label>
                    {{ facility.facilityName }}
                    <p>{{ facility.facilityId }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </div>
          </ion-list>
        </ion-radio-group>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button :disabled="selectedFacilityId === currentFacility.facilityId" @click="updateFacility">
            <ion-icon :icon="saveOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonImg, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonMenuButton, IonModal, IonNote, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { translate } from "@/i18n"
import { bluetoothOutline, closeOutline, medicalOutline, openOutline, shieldCheckmarkOutline, saveOutline } from "ionicons/icons"
import { useAuthStore } from "@/stores/authStore";
import { Actions, hasPermission } from "@/authorization"
import router from "@/router";
import { DateTime } from "luxon";
import { useUserProfile } from "@/stores/userProfileStore";
import { useProductStore } from "@/stores/productStore";
import pairingResetBarcode from "@/assets/images/pairing-reset.png"
import iosKeyboardBarcode from "@/assets/images/ios-keyboard.png"
import { useDiagnostics } from "@/composables/useDiagnostics";

const appVersion = ref("")
const appInfo = (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any

const userProfile = computed(() => useUserProfile().getUserProfile);
const oms = useAuthStore().oms
const omsRedirectionLink = computed(() => useAuthStore().omsRedirectionUrl);
const eComStores = computed(() => useProductStore().getProductStores) as any;
const currentEComStore = computed(() => useProductStore().getCurrentProductStore);
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const productIdentificationOptions = computed(() => useProductStore().getProductIdentificationOptions);

const timeZones = computed(() => useUserProfile().getTimeZones)
const currentTimeZoneId = computed(() => userProfile.value?.timeZone)

const isFacilityLoading = ref(true);
const isTimeZoneLoading = ref(true);
const timeZoneModal = ref();
const timeZoneQuery = ref('');
const facilityQuery = ref('');
const filteredTimeZones = ref([]) as any
const timeZoneId = ref(currentTimeZoneId.value)
// Fetching timeZone of the browser
const browserTimeZone = ref({
  label: '',
  id: Intl.DateTimeFormat().resolvedOptions().timeZone
})

const productStore = useProductStore();

const facilities = computed(() => productStore.getFacilities)
const currentFacility = computed(() => productStore.getCurrentFacility)

const facilityModal = ref()
const filteredFacilities = ref([]) as any
const selectedFacilityId = ref('')

onMounted(async () => {
  appVersion.value = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
  await useProductStore().getSettings(useProductStore().getCurrentProductStore.productStoreId)
  await useProductStore().prepareProductIdentifierOptions();
  await useProductStore().getDxpIdentificationPref(currentEComStore.value.productStoreId);
  await useUserProfile().getDxpAvailableTimeZones();
  timeZoneId.value = userProfile.value.timeZone
  browserTimeZone.value.label = ((timeZones.value as any[])?.find((timeZone: any) => (timeZone?.id || '').toLowerCase().includes(browserTimeZone.value.id.toLowerCase()))?.label) || ''

  findTimeZone();
})

function logout() {
  useAuthStore().logout();
}

function goToLaunchpad() {
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
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

const closeTimeZoneModal = () => {
  timeZoneId.value = currentTimeZoneId.value;
  timeZoneModal.value.$el.dismiss(null, 'cancel');
}

async function setUserTimeZone() {
  try {
    await useUserProfile().setDxpUserTimeZone(timeZoneId.value);
  } catch (error) {
    console.error("Error Updating Time Zone: ", error);
  }
  closeTimeZoneModal();
}

function findTimeZone() {
  const searchedString = timeZoneQuery.value.toLowerCase();
  filteredTimeZones.value = timeZones.value.filter((timeZone: any) => timeZone.id.toLowerCase().match(searchedString) || timeZone.label.toLowerCase().match(searchedString));

  filteredTimeZones.value = filteredTimeZones.value.filter((timeZone: any) => !timeZone.id.toLowerCase().match(browserTimeZone.value.id.toLowerCase()));
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement()
  element.select();
}

function preventSpecialCharacters($event: any) {
  // Searching special characters fails the API, hence, they must be omitted
  if(/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
}

function search() {
  isTimeZoneLoading.value = true;
  findTimeZone();
  isTimeZoneLoading.value = false;
}

// clearing the data explicitely as the modal is mounted due to the component being mounted always
function clearTimeZoneSearch() {
  timeZoneQuery.value = ''
  filteredTimeZones.value = []
  isTimeZoneLoading.value = true
}

const getCurrentTime = (zone: string, format = 't ZZZZ') => {
  return DateTime.now().setZone(zone).toFormat(format)
}

const closeFacilityModal = () => {
  facilityModal.value.$el.dismiss(null, 'cancel');
}

function loadFacilities() {
  filteredFacilities.value = facilities.value;
  selectedFacilityId.value = currentFacility.value.facilityId
  isFacilityLoading.value = false;
}

const findFacility = (event?: any) => {
  isFacilityLoading.value = true
  const query = event ? event.target.value : facilityQuery.value;
  const searchedString = (query || '').trim().toLowerCase();
  if (searchedString) {
    filteredFacilities.value = facilities.value.filter((facility: any) =>
      facility.facilityName?.toLowerCase().includes(searchedString) ||
      facility.facilityId?.toLowerCase().includes(searchedString)
    );
  } else {
    filteredFacilities.value = facilities.value;
  }
  isFacilityLoading.value = false
}

async function updateFacility() {
  const selectedFacility = facilities.value.find((facility: any) => facility.facilityId === selectedFacilityId.value)
  await productStore.setFacilityPreference(selectedFacility)
  closeFacilityModal();
}

function clearFacilitySearch() {
  facilityQuery.value = ''
  filteredFacilities.value = []
  selectedFacilityId.value = ''
  isFacilityLoading.value = true
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
