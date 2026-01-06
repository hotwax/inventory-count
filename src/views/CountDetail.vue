<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/count"/>
        <ion-title slot="start">{{ translate("Count Details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="count-detail-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="location">{{ translate("location") }}</ion-segment-button>
        <ion-segment-button value="product">{{ translate("product") }}</ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-menu side="end" content-id="count-detail-content" menu-id="count-detail-filter">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ translate("Filters") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item lines="none">
            <ion-checkbox :checked="filters.hideCompleted" @ionChange="updateFilter('hideCompleted', $event.detail.checked)">
              {{ translate("Hide completed") }}
            </ion-checkbox>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-content id="count-detail-content">
      <ion-segment-view>
      <ion-segment-content v-show="activeSegment === 'location'" id="location">
        <ion-card v-for="location in filteredItemsByLocation" :key="location.locationSeqId">
          <ion-card-header>
            <ion-card-title>
              {{ location.locationSeqId }}
            </ion-card-title>
            <ion-label class="ion-text-end">
                {{ translate("products remaining", { count: location.pendingCount }) }}
                <p>{{ translate("requested", { count: location.totalCount }) }}</p>
            </ion-label>
          </ion-card-header>

          <ion-item lines="none">
            <ion-label>
              <p>{{ translate("Sessions at this location") }}</p>
            </ion-label>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("On this device") }}</ion-label>
          </ion-item-divider>

          <ion-list v-if="location.sessions.onDevice.length">
            <ion-item v-for="session in location.sessions.onDevice" :key="session.inventoryCountImportId" @click="viewSession(session)" button detail>
              <ion-label>
                {{ session.countImportName || translate("Untitled session") }}
                <p>{{ translate("Created by") }} {{ session.uploadedByUserLogin }}</p>
              </ion-label>
              <ion-note slot="end">{{ getSessionStatus(session.statusId) }}</ion-note>
            </ion-item>

            <ion-button v-if="location.sessions.onDevice.length" fill="outline" expand="block" class="ion-margin" @click.stop="viewSession(location.sessions.onDevice[0])">
              {{ translate("CONTINUE SESSION") }}
            </ion-button>
          </ion-list>

          <ion-button fill="outline" expand="block" class="ion-margin" @click="startNewSession(location.locationSeqId)">
            {{ translate("START NEW SESSION") }}
          </ion-button>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Other sessions") }}</ion-label>
          </ion-item-divider>

          <ion-list v-if="location.sessions.other.length">
            <ion-item v-for="session in location.sessions.other" :key="session.inventoryCountImportId" @click="viewSession(session)" button detail>
              <ion-label>
                {{ session.countImportName || translate("Untitled session") }}
                <p>{{ translate("Created by") }} {{ session.uploadedByUserLogin }}</p>
              </ion-label>
              <ion-note slot="end">{{ getSessionStatus(session.statusId) }}</ion-note>
            </ion-item>
          </ion-list>
          <ion-item v-else lines="none">
            <ion-label><p>{{ translate("No other sessions") }}</p></ion-label>
          </ion-item>
        </ion-card>
      </ion-segment-content>
      <ion-segment-content v-show="activeSegment === 'product'" id="product">
        <ion-card v-for="product in filteredItemsByProduct" :key="product.productId">
          <ion-card-header>
            <ion-card-title>
              {{ product.product.productName }}
            </ion-card-title>
            <ion-label class="ion-text-end">
              {{ translate("locations remaining", { count: product.pendingCount }) }}
              <p>{{ translate("requested", { count: product.totalCount }) }}</p>
            </ion-label>
          </ion-card-header>

          <ion-item lines="none">
            <ion-label>
              <p>{{ translate("Sessions for this product") }}</p>
            </ion-label>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("On this device") }}</ion-label>
          </ion-item-divider>

          <ion-list v-if="product.sessions.onDevice.length">
            <ion-item v-for="session in product.sessions.onDevice" :key="session.inventoryCountImportId" @click="viewSession(session)" button detail>
              <ion-label>
                {{ session.countImportName || translate("Untitled session") }}
                <p>{{ translate("Created by") }} {{ session.uploadedByUserLogin }}</p>
              </ion-label>
              <ion-note slot="end">{{ getSessionStatus(session.statusId) }}</ion-note>
            </ion-item>

            <ion-button v-if="product.sessions.onDevice.length" fill="outline" expand="block" class="ion-margin" @click.stop="viewSession(product.sessions.onDevice[0])">
              {{ translate("CONTINUE SESSION") }}
            </ion-button>
          </ion-list>

          <ion-button fill="outline" expand="block" class="ion-margin" @click="startNewSession(undefined, product.product.productName)">
            {{ translate("START NEW SESSION") }}
          </ion-button>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Other sessions") }}</ion-label>
          </ion-item-divider>

          <ion-list v-if="product.sessions.other.length">
            <ion-item v-for="session in product.sessions.other" :key="session.inventoryCountImportId" @click="viewSession(session)" button detail>
              <ion-label>
                {{ session.countImportName || translate("Untitled session") }}
                <p>{{ translate("Created by") }} {{ session.uploadedByUserLogin }}</p>
              </ion-label>
              <ion-note slot="end">{{ getSessionStatus(session.statusId) }}</ion-note>
            </ion-item>
          </ion-list>
          <ion-item v-else lines="none">
            <ion-label><p>{{ translate("No other sessions") }}</p></ion-label>
          </ion-item>
        </ion-card>
      </ion-segment-content>
    </ion-segment-view>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductMaster } from '@/composables/useProductMaster';
import { translate } from '@/i18n';
import { loader, showToast } from '@/services/uiUtils';
import { hasError } from '@/stores/authStore';
import { IonBackButton, IonButtons, IonCheckbox, IonCard, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuButton, IonPage, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonTitle, IonToolbar, onIonViewDidEnter } from '@ionic/vue';
import { filterOutline } from "ionicons/icons";
import { ref, defineProps, computed } from 'vue';
import { useUserProfile } from '@/stores/userProfileStore';
import router from '@/router';

const activeSegment = ref('location')

const inventoryCountItems = ref<any>([]);
const sessions = ref<any>([]);
const itemsByLocation = ref<any>([]);
const itemsByProduct = ref<any>([]);
const workEffort = ref<any>(null);
const userProfileStore = useUserProfile();
const userProfile = computed(() => userProfileStore.getUserProfile);
const filters = computed(() => userProfileStore.getListPageFilters('countDetail'));

function updateFilter(key: string, value: any) {
  userProfileStore.updateUiFilter('countDetail', key, value);
}

const filteredItemsByLocation = computed(() => {
  if (filters.value.hideCompleted) {
    return itemsByLocation.value.filter((location: any) => location.pendingCount > 0);
  }
  return itemsByLocation.value;
})

const filteredItemsByProduct = computed(() => {
  if (filters.value.hideCompleted) {
    return itemsByProduct.value.filter((product: any) => product.pendingCount > 0);
  }
  return itemsByProduct.value;
})

const props = defineProps<{
  workEffortId: string;
}>();

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  await getCycleCountItems();
  groupItemsByLocationAndProduct();
  loader.dismiss();
});



async function getCycleCountItems() {
  try {
    const resp = await useInventoryCountRun().getCycleCountItems({ workEffortId: props.workEffortId });

    if (resp && !hasError(resp)) {
      workEffort.value = resp.data;
      if (resp.data?.items?.length) {
        const importItems = resp.data.items;

        try {
          const productsIds = [...new Set(importItems
            .filter((item: any) => item?.productId)
            .map((item: any) => item.productId)
          )];

          await useProductMaster().prefetch(productsIds as any);
          for (const productId of productsIds) {
            const { product } = await useProductMaster().getById(productId as any);
            if (!product) continue;
            importItems
            .filter((item: any) => item.productId === productId)
            .forEach((item: any) => {
              item.product = product;
            });
          }
          inventoryCountItems.value = importItems;
        } catch (error) {
          console.error("Error in Prefetch: ", error);
        }
      }
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error getting cycle count items", error);
    showToast("Falied to fetch items");
  }

}


function groupItemsByLocationAndProduct() {
  const locationMap: Record<string, any[]> = {};
  const productMap: Record<string, any[]> = {};
  const sessionMap: Record<string, any> = {};

  for (const item of inventoryCountItems.value) {
    const { locationSeqId, productId, inventoryCountImportId } = item;

    if (locationSeqId) {
      (locationMap[locationSeqId] ||= []).push(item);
    }

    if (productId) {
      (productMap[productId] ||= []).push(item);
    }

    if (inventoryCountImportId && !sessionMap[inventoryCountImportId]) {
      sessionMap[inventoryCountImportId] = {
        inventoryCountImportId,
        countImportName: item.countImportName,
        uploadedByUserLogin: item.uploadedByUserLogin,
        statusId: item.statusId,
        facilityAreaId: locationSeqId
      }
    }
  }

  sessions.value = Object.values(sessionMap);

  itemsByLocation.value = Object.entries(locationMap).map(
    ([locationSeqId, items]) => {
      const pendingItems = items.filter(i => i.quantity === null);
      const locationSessions = sessions.value.filter((s: any) => s.facilityAreaId === locationSeqId);
      return {
        locationSeqId,
        pendingCount: new Set(pendingItems.map(i => i.productId)).size,
        totalCount: new Set(items.map(i => i.productId)).size,
        sessions: {
          onDevice: locationSessions.filter((s: any) => s.uploadedByUserLogin === userProfile.value.userLoginId),
          other: locationSessions.filter((s: any) => s.uploadedByUserLogin !== userProfile.value.userLoginId)
        }
      }
    }
  );

  itemsByProduct.value = Object.entries(productMap).map(
    ([productId, items]) => {
      const pendingItems = items.filter(i => i.quantity === null);
      const productSessions = sessions.value.filter((s: any) => 
        items.some((item: any) => item.inventoryCountImportId === s.inventoryCountImportId)
      );

      return {
        productId,
        product: items[0].product,
        pendingCount: new Set(pendingItems.map(i => i.locationSeqId)).size,
        totalCount: new Set(items.map(i => i.locationSeqId)).size,
        sessions: {
          onDevice: productSessions.filter((s: any) => s.uploadedByUserLogin === userProfile.value.userLoginId),
          other: productSessions.filter((s: any) => s.uploadedByUserLogin !== userProfile.value.userLoginId)
        }
      }
    }
  );
}

function getSessionStatus(statusId: string) {
  switch (statusId) {
    case 'SESSION_CREATED': return 'Created';
    case 'SESSION_ASSIGNED': return 'In progress';
    case 'SESSION_SUBMITTED': return 'Submitted';
    case 'SESSION_VOIDED': return 'Voided';
    default: return statusId;
  }
}

function viewSession(session: any) {
  router.push(`/session-count-detail/${props.workEffortId}/${workEffort.value?.workEffortPurposeTypeId}/${session.inventoryCountImportId}`);
}

async function startNewSession(locationSeqId?: string, productName?: string) {
  showToast(translate("Session added successfully"));
  await getCycleCountItems();
  groupItemsByLocationAndProduct();
  router.push(`/session-count-detail/${props.workEffortId}/${workEffort.value?.workEffortPurposeTypeId}/new`);
}

</script>

<style scoped>
ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
}

ion-card {
  margin-bottom: var(--spacer-base);
}
</style>