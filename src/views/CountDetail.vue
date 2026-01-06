<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/count"/>
        <ion-title slot="start">{{ translate("Count Details") }}</ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="location">{{ translate("location") }}</ion-segment-button>
        <ion-segment-button value="product">{{ translate("product") }}</ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-segment-view>
      <ion-segment-content v-show="activeSegment === 'location'" id="location">
        <ion-card v-for="location in itemsByLocation" :key="location.locationSeqId">
          <ion-card-header>
            <ion-card-title>{{ location.locationSeqId }}</ion-card-title>
          </ion-card-header>

          <ion-list v-if="location.pendingItems.length">
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Pending</ion-label>
              </ion-item-divider>

              <ion-item
                v-for="item in location.pendingItems"
                :key="item.importItemSeqId">
                <ion-label>
                  {{ useProductMaster().primaryId(item.product) }}
                  <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                </ion-label>
              </ion-item>
            </ion-item-group>
          </ion-list>

          <ion-list v-if="location.countedItems.length">
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Counted</ion-label>
              </ion-item-divider>

              <ion-item
                v-for="item in location.countedItems"
                :key="item.importItemSeqId">
                <ion-label>
                  {{ useProductMaster().primaryId(item.product) }}
                  <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                </ion-label>
                <p v-if="item.countedByUserLogin">{{ item.countedByUserLogin }}</p>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ion-card>
      </ion-segment-content>
      <ion-segment-content v-show="activeSegment === 'product'" id="product">
        <ion-card v-for="product in itemsByProduct" :key="product.productId">
          <ion-card-header>
            <ion-card-title>{{ product.product.productName }}</ion-card-title>
          </ion-card-header>

          <ion-list v-if="product.pendingItems.length">
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Pending</ion-label>
              </ion-item-divider>

              <ion-item
                v-for="item in product.pendingItems"
                :key="item.importItemSeqId">
                <ion-label>
                  {{ item.locationSeqId }}
                </ion-label>
              </ion-item>
            </ion-item-group>
          </ion-list>

          <ion-list v-if="product.countedItems.length">
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Counted</ion-label>
              </ion-item-divider>

              <ion-item
                v-for="item in product.countedItems"
                :key="item.importItemSeqId">
                <ion-label>
                  Product: {{ item.productId }} | Qty: {{ item.quantity }}
                </ion-label>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ion-card>
      </ion-segment-content>
    </ion-segment-view>
  </ion-page>
</template>

<script setup lang="ts">
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductMaster } from '@/composables/useProductMaster';
import { translate } from '@/i18n';
import { loader, showToast } from '@/services/uiUtils';
import { hasError } from '@/stores/authStore';
import { IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter } from '@ionic/vue';
import { ref, defineProps } from 'vue';

const activeSegment = ref('location')

const inventoryCountItems = ref<any>([]);
const itemsByLocation = ref<any>([]);
const itemsByProduct = ref<any>([]);

const props = defineProps<{
  workEffortId: string;
}>();

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  await getCycleCountItems();
  loader.dismiss();
});

async function getCycleCountItems() {
  try {
    const resp = await useInventoryCountRun().getCycleCountItems({ workEffortId: props.workEffortId });

    if (resp && !hasError(resp) && resp.data?.items?.length) {
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
        groupItemsByLocationAndProduct();
      } catch (error) {
        console.error("Error in Prefetch: ", error);
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

  for (const item of inventoryCountItems.value) {
    const { locationSeqId, productId } = item;

    if (locationSeqId) {
      (locationMap[locationSeqId] ||= []).push(item);
    }

    if (productId) {
      (productMap[productId] ||= []).push(item);
    }
  }

  itemsByLocation.value = Object.entries(locationMap).map(
    ([locationSeqId, items]) => ({
      locationSeqId,
      pendingItems: items.filter(i => i.quantity === null),
      countedItems: items.filter(i => i.quantity !== null)
    })
  );

  itemsByProduct.value = Object.entries(productMap).map(
    ([productId, items]) => ({
      productId,
      product: items[0].product,
      pendingItems: items.filter(i => i.quantity === null),
      countedItems: items.filter(i => i.quantity !== null)
    })
  );
}

</script>