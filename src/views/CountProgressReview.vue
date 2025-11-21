<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/count" />
        <ion-title>{{ translate("Track progress") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Top Summary Section -->
      <div class="summary-section ion-padding">
        <div class="header-actions">
          <ion-button fill="outline" color="success">
            <ion-icon slot="start" :icon="checkmarkDoneOutline" />
            {{ translate("SUBMIT FOR REVIEW") }}
          </ion-button>
        </div>

        <div class="progress-summary">
          <!-- Card 1: Count Info -->
          <ion-card>
            <ion-card-header>
              <div>
                <ion-label color="warning" class="overline">
                  {{ translate("HARD COUNT") }}
                </ion-label>
                <h1>Count name</h1>
                <ion-card-subtitle>created date</ion-card-subtitle>
              </div>
            </ion-card-header>

            <ion-item lines="none">
              <ion-label>{{ translate("Due date") }}</ion-label>
              <ion-note slot="end">2nd July 2024</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ translate("Start date") }}</ion-label>
              <ion-note slot="end">2nd July 2024</ion-note>
            </ion-item>

            <ion-list>
              <ion-list-header>
                <ion-label>{{ translate("Sessions") }}</ion-label>
              </ion-list-header>
              
              <ion-item-divider color="light">
                <ion-label>{{ translate("On this device") }}</ion-label>
              </ion-item-divider>
              
              <ion-item>
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("In progress") }}</ion-note>
              </ion-item>

              <ion-item-divider color="light">
                <ion-label>{{ translate("Other sessions") }}</ion-label>
              </ion-item-divider>
              
              <ion-item>
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("In progress") }}</ion-note>
              </ion-item>

              <ion-item lines="none">
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("Submitted") }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>

          <!-- Card 2: Products Counted -->
          <ion-card>
            <ion-card-header>
              <p class="overline">
                {{ translate("PRODUCTS COUNTED") }}
              </p>
              <ion-label class="big-number">0</ion-label>
              <p>50 products remaining</p>
            </ion-card-header>

            <ion-list lines="none">
              <ion-item>
                <ion-label>Session 1 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Session 2 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Session 3 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>

          <!-- Card 3: Units Counted -->
          <ion-card>
            <ion-card-header>
              <ion-label class="overline">
                {{ translate("UNITS COUNTED") }}
              </ion-label>
              <div class="big-number">0</div>
            </ion-card-header>

            <ion-list lines="none">
              <ion-item>
                <ion-label>Session 1 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Session 2 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Session 3 name</ion-label>
                <ion-note slot="end">0</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
        </div>
      </div>

      <!-- Segments -->
      <div class="segments-container">
        <ion-segment value="uncounted">
          <ion-segment-button value="uncounted" content-id="uncounted">
            <ion-label>50 UNCOUNTED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="undirected" content-id="undirected">
            <ion-label>45 UNDIRECTED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="unmatched" content-id="unmatched">
            <ion-label>4 UNMATCHED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="counted" content-id="counted">
            <ion-label>72 COUNTED</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- List -->
      <ion-segment-view>
        <ion-segment-content id="uncounted">
          <ion-list>
            <ion-item v-for="item in uncountedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content>

        <ion-segment-content id="undirected">
          <ion-list>
            <ion-item v-for="item in undirectedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content>

        <ion-segment-content id="unmatched">
          <ion-list>
            <ion-item v-for="item in unmatchedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content>

        <ion-segment-content id="counted">
          <ion-list>
            <ion-item v-for="item in countedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content>
      </ion-segment-view>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonBadge,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonListHeader,
  IonItem,
  IonItemDivider,
  IonThumbnail,
  IonSegmentContent,
  IonSegmentView,
} from '@ionic/vue';
import { checkmarkDoneOutline, imageOutline } from 'ionicons/icons';
import { translate } from '@/i18n';

const mockData = {
  uncounted: [
    { id: 1, primaryId: 'Product A', secondaryId: 'SKU-001', units: '10 Units' },
    { id: 2, primaryId: 'Product B', secondaryId: 'SKU-002', units: '5 Units' },
  ],
  undirected: [
    { id: 3, primaryId: 'Product C', secondaryId: 'SKU-003', units: '12 Units' },
  ],
  unmatched: [
    { id: 4, primaryId: 'Product D', secondaryId: 'SKU-004', units: 'Mismatch' },
  ],
  counted: [
    { id: 5, primaryId: 'Product E', secondaryId: 'SKU-005', units: '20 Units' },
    { id: 6, primaryId: 'Product F', secondaryId: 'SKU-006', units: '8 Units' },
  ],
};

const uncountedItems = computed(() => mockData.uncounted);
const undirectedItems = computed(() => mockData.undirected);
const unmatchedItems = computed(() => mockData.unmatched);
const countedItems = computed(() => mockData.counted);
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacer-base);
}

.progress-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
}

.progress-summary ion-card {
  flex: 0 1 305px;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

.segments-container {
  border-bottom: 1px solid var(--ion-color-light);
  margin-top: var(--spacer-lg);
}

</style>