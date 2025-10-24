<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/count"></ion-back-button>
        </ion-buttons>
        <ion-title>Session Count Detail</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">SKU / Barcode</ion-label>
            <ion-input
              ref="barcodeInput"
              v-model="scannedValue"
              placeholder="Scan or type SKU"
              @keyup.enter="handleScan"
              :disabled="sessionLocked"
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            color="success"
            class="focus ion-margin-top ion-margin-horizontal"
            @click="startSession"
            :disabled="sessionLocked"
          >
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            Start counting
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              Items you scan or count will show on this list. Focus your scanner on the input field to begin.
            </ion-label>
          </ion-item>

          <div class="events">
            <ion-list>
              <ion-item v-for="event in events" :key="event.id">
                <ion-thumbnail slot="start">
                  <Image v-if="event.matched && event.product" :src="event.product.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ event.scannedValue }}
                  <p>{{ timeAgo(event.createdAt) }}</p>
                </ion-label>
                <ion-note slot="end">{{ event.qty }}</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <!-- Right Panel -->
        <div class="count-dashboard">
          <div class="header ion-padding">
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ countTypeLabel }}</p>
                <h1>{{ sessionName }}</h1>
                <p>Created by {{ userLogin?.userFullName ? userLogin.userFullName : userLogin.username }}</p>
              </ion-label>
            </ion-item>
            <ion-button color="warning" fill="outline" @click="discardSession" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="exitOutline"></ion-icon>
              Discard session
            </ion-button>
            <ion-button color="success" fill="outline" @click="submitSession" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
              Submit session
            </ion-button>
          </div>

          <div class="statistics ion-padding">
            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">Products counted</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.productsCounted }}</p>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>Unmatched scans</ion-label>
                  <p slot="end">{{ stats.unmatched }}</p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">Units counted</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.totalUnits }}</p>
              </ion-card-content>
            </ion-card>
          </div>
          <ion-segment value="unmatched">
            <ion-segment-button content-id="uncounted" value="uncounted">
              <ion-label>
                Uncounted
              </ion-label>
            </ion-segment-button>
            <ion-segment-button content-id="undirected" value="undirected">
              <ion-label>Undirected</ion-label>
            </ion-segment-button>
            <ion-segment-button content-id="unmatched" value="unmatched">
              <ion-label>Unmatched</ion-label>
            </ion-segment-button>
            <ion-segment-button content-id="counted" value="counted">
              <ion-label>Counted</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <ion-segment-content id="uncounted" class="cards">
              <ion-card v-for="index in 3" :key="index">
                <dxp-image>
                </dxp-image>
                <ion-item>
                  <ion-label>
                    Primary id
                    <p>secondary id</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>
            <ion-segment-content id="undirected" class="cards">
              <ion-card v-for="index in 3" :key="index">
                <dxp-image>
                </dxp-image>
                <ion-item>
                  <ion-label>
                    Primary id
                    <p>secondary id</p>
                    <p>40 units</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>
            <ion-segment-content id="unmatched" class="cards">
              <ion-card v-for="index in 6" :key="index">
                <ion-item>
                  <ion-label>
                    <h2>{{ '' }}</h2>
                    <p>{{ '' }}</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <ion-segment-content id="counted">
              <ion-card v-for="record in countedItems" :key="record.uuid">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image v-if="record.productId" :src="getProduct(record.productId)?.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ record.sku }}
                    <p>{{ record.quantity }} units</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>
          </ion-segment-view>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import {
    IonBackButton, IonButtons, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonPage,
    IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonThumbnail, IonTitle, IonToolbar
  } from '@ionic/vue';
  import { barcodeOutline, checkmarkDoneOutline, exitOutline } from 'ionicons/icons';
  import { ref, onMounted, computed, defineProps } from 'vue';
  import { useProductMaster } from '@/composables/useProductMaster';
  import { useInventoryCountImport } from '@/composables/useInventoryCountImportItem';
  // Optional background aggregation worker — fallback no-op if the module is missing.
  let startBackgroundAggregation: () => void = () => {
    /* no-op */
  };
  (async () => {
    try {
      const mod = await import('@/workers/backgroundAggregation');
      if (mod?.startBackgroundAggregation) startBackgroundAggregation = mod.startBackgroundAggregation;
    } catch (e) {
      // ignore if the optional worker module is not present
    }
  })();
  import { showToast } from '@/utils'; 
  import { useStore } from '@/store';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  dayjs.extend(relativeTime);
  import { v4 as uuidv4 } from 'uuid';
  import Image from "@/components/Image.vue";
  import api from '@/api';
  import { CountService } from '@/services/CountService';

  const props = defineProps<{ workEffortId: string; inventoryCountImportId: string; inventoryCountTypeId: string }>();

  const { recordScan, loadInventoryItemsFromBackend } = useInventoryCountImport();
  const { init, getById, prefetch, getAllProductIdsFromIndexedDB, cacheReady } = useProductMaster();
  const store = useStore();

  const scannedValue = ref('');
  const events = ref<any[]>([]);
  const unmatchedEvents = ref<any[]>([]);
  const countedItems = ref<any[]>([]);
  const selectedSegment = ref('counted');
  const stats = ref({ productsCounted: 0, totalUnits: 0, unmatched: 0 });
  const barcodeInput = ref();
  const sessionLocked = ref(false);
  const sessionName = computed(() => props.inventoryCountTypeId);
  const countTypeLabel = computed(() =>
    props.inventoryCountTypeId === 'HARD_COUNT' ? 'Hard Count' : 'Directed Count'
  );
  const userLogin = computed(() => store.getters['user/getUserProfile']);

  onMounted(async () => {
    init();
    await startSession();
    startBackgroundAggregation();
  });

  // --- Core session init ---
  async function startSession() {
    try {
      const resp = await CountService.getInventoryCountImportSession({ workEffortId: props.workEffortId, inventoryCountImportId: props.inventoryCountImportId });

      if (resp?.data?.activeUserLoginId) {
        sessionLocked.value = true;
        showToast('This session is already being worked on by another user.');
        return;
      }

      await loadInventoryItemsFromBackend(props.workEffortId, props.inventoryCountImportId);

      const productIds = await getAllProductIdsFromIndexedDB(props.inventoryCountImportId);
      if (productIds.length) await prefetch(productIds);

      showToast('Session ready to start counting');
    } catch (err) {
      console.error(err);
      showToast('Failed to initialize session');
    }

    updateStats();
    focusScanner();
  }

  // --- Scanning ---
  function focusScanner() {
    barcodeInput.value?.$el?.setFocus();
  }

  async function handleScan() {
    const value = scannedValue.value.trim();
    console.log('Scanned value:', value);
    if (!value) return;

    try {
      const productResp = await getById(value);
      const matched = !!productResp?.product;
      const qty = 1;

      await recordScan({ inventoryCountImportId: props.inventoryCountImportId, sku: value, qty });

      const event = {
        id: Date.now(),
        scannedValue: value,
        qty,
        createdAt: Date.now(),
        matched,
        product: matched ? productResp.product : null
      };
      events.value.unshift(event);

      if (matched) {
        countedItems.value.push({
          uuid: uuidv4(),
          sku: value,
          productId: productResp.product.productId,
          quantity: qty
        });
      } else {
        unmatchedEvents.value.push(event);
      }

      updateStats();
    } catch (err) {
      console.error(err);
      showToast('Failed to record scan');
    } finally {
      scannedValue.value = '';
    }
  }

  // --- Stats ---
  function updateStats() {
    const totalUnits = events.value.length
      ? events.value.reduce((a, b) => a + (b.qty || 0), 0)
      : countedItems.value.reduce((a, b) => a + (b.quantity || 0), 0);

    const distinctSkus = new Set(countedItems.value.map(i => i.sku)).size;

    stats.value = {
      productsCounted: distinctSkus,
      totalUnits,
      unmatched: unmatchedEvents.value.length
    };
  }

  // --- Utility ---
  function timeAgo(ts: number) {
    return dayjs(ts).fromNow();
  }

  function getProduct(productId: string) {
    return cacheReady.value ? store.getters['product/getProduct'](productId) : null;
  }

  // --- Submit / Discard ---
  async function submitSession() {
    try {
      await api({
        url: `/cycleCounts/${props.inventoryCountImportId}/submit`,
        method: 'POST',
        data: {
          activeUserLoginId: null,
          statusId: 'INV_COUNT_SUBMITTED'
        }
      });
      showToast('Session submitted successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit session');
    }
  }

  async function discardSession() {
    try {
      await api({
        url: `/cycleCounts/${props.inventoryCountImportId}/discard`,
        method: 'POST',
        data: { activeUserLoginId: null }
      });
      showToast('Session discarded');
    } catch (err) {
      console.error(err);
      showToast('Failed to discard session');
    }
  }
</script>

<style scoped>

main {
  display: grid;
  grid-template-columns: 25% auto;
  justify-content: unset;
  align-items: stretch;
}

.count-events {
  border-right: 1px solid var(--ion-color-medium);
  contain: paint;
  height: 100%;
  display: grid;
  grid-template-areas: 
  "scan"
  "focus"
  "empty"
  "events";

  grid-template-rows: min-content min-content min-content 1fr;
}

.scan {
  grid-area: scan;
}

.focus {
  grid-area: focus;
}

.empty {
  grid-area: empty;
}

.events {
  grid-area: events;
  overflow-y: scroll;
  max-height: 100%;
  position: relative;
}

.events ion-list {
  position: absolute;
  inset-inline: 0;
}

.add-pre-counted {
  position: absolute;
  bottom: var(--spacer-base);
  inset-inline: var(--spacer-sm);
  width: stretch;
  grid-area: events;
  align-self: end;
}

ion-card ion-item {
  --background: transparent
}

.count-dashboard {
  height: 100%;
  overflow-y: scroll;
}

.header {
  display: flex;
  flex-wrap: wrap;
}

.header ion-item {
  flex: 1 0 max-content;
}

.header ion-button {
  flex: 0 1 max-content;
}

.statistics {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
}

.statistics ion-card {
  flex: 0 1 305px;
}

ion-segment {
  justify-content: start;
  border-bottom: 1px solid var(--ion-color-medium);
}

ion-segment-view {
  height: unset;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

</style>