<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="'/count-detail/' + workEffortId" />
        <ion-title>{{ translate("Session") }}</ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="scan">
          <ion-label>{{ translate("SCAN") }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="review">
          <ion-label>{{ translate("REVIEW & SUBMIT") }}</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content>
      <ion-segment-view>
        <ion-segment-content v-show="activeSegment === 'scan'" id="scan">
          <ion-item lines="none" class="scan-input">
            <ion-label>
              {{ translate("UPCA") }}
              <p>{{ translate("Scan a barcode") }}</p>
            </ion-label>
          </ion-item>

          <ion-button expand="block" color="success" class="scan-button ion-margin">
            <ion-icon slot="start" :icon="barcodeOutline" />
            {{ translate("READY TO SCAN") }}
          </ion-button>

          <ion-list>
            <ion-item>
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" size="large" />
              </ion-thumbnail>
              <ion-label>
                scanned identifier
                <p>matching...</p>
                <p>5 scans</p>
              </ion-label>
              <ion-note slot="end">30 seconds ago</ion-note>
            </ion-item>

            <ion-item>
              <ion-thumbnail slot="start">
                <img src="https://picsum.photos/40" />
              </ion-thumbnail>
              <ion-label>
                Primary Identifier
                <p>Secondary Identifier</p>
              </ion-label>
              <ion-note slot="end">35 seconds ago</ion-note>
            </ion-item>

            <ion-item>
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" size="large" />
              </ion-thumbnail>
              <ion-label>
                scanned value
                <p>no match found</p>
                <p>4 scans</p>
              </ion-label>
              <div slot="end" class="ion-text-end">
                <ion-note>2 minutes ago</ion-note>
                <ion-button fill="outline" size="small">{{ translate("MATCH") }}</ion-button>
              </div>
            </ion-item>
          </ion-list>
        </ion-segment-content>

        <ion-segment-content v-show="activeSegment === 'review'" id="review">
          <ion-item lines="none">
            <ion-label><h1>1PF-Soup</h1></ion-label>
          </ion-item>

          <ion-card>
            <ion-card-header>
              <p class="overline">{{ translate("UNITS COUNTED") }}</p>
              <ion-card-title>105</ion-card-title>
            </ion-card-header>
            <ion-item lines="none">
              <ion-label>{{ translate("Pending match scans") }}</ion-label>
              <ion-note slot="end">4</ion-note>
            </ion-item>

            <ion-accordion-group>
              <ion-accordion value="uncounted">
                <ion-item slot="header">
                  <ion-label>{{ translate("Uncounted products at 1PF-Soup") }}</ion-label>
                  <ion-note slot="end">4</ion-note>
                </ion-item>
                <div slot="content">
                  <ion-list>
                    <ion-item v-for="n in 4" :key="n">
                      <ion-label>
                        Product {{ n }}
                        <p>Description for product {{ n }}</p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          </ion-card>

          <ion-list>
            <ion-list-header>
              <ion-label>
                <p class="ion-text-capitalize">{{ translate("3 unmatched items") }}</p>
              </ion-label>
            </ion-list-header>

            <ion-card v-for="n in 1" :key="n">
              <ion-card-header>
                <div class="unmatched-item-header">
                  <ion-label>
                    10022001922
                    <p>10 scans ago</p>
                    <p>3 minutes ago</p>
                  </ion-label>
                  <ion-button fill="outline">
                    <ion-icon slot="start" :icon="searchOutline" />
                    {{ translate("MATCH") }}
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                <ion-list class="timeline">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <ion-icon :icon="imageOutline" size="large" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">3 ITEMS AGO</p>
                      &lt;primaryid&gt;
                      <p>&lt;Secondaryid&gt;</p>
                      <p>&lt;scanned value&gt;</p>
                    </ion-label>
                    <div slot="end" class="ion-text-end">
                      <p class="overline">last match</p>
                      <ion-icon :icon="chevronUpCircleOutline" color="medium" />
                    </div>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <ion-icon :icon="imageOutline" size="large" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">2 ITEMS LATER</p>
                      &lt;primaryid&gt;
                    </ion-label>
                    <div slot="end" class="ion-text-end">
                      <p class="overline">next match</p>
                      <ion-icon :icon="chevronDownCircleOutline" color="medium" />
                    </div>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </ion-list>
        </ion-segment-content>
      </ion-segment-view>

      <ion-modal :is-open="true" :breakpoints="[0.12, 0.5, 1]" :initial-breakpoint="0.12" :backdrop-breakpoint="0.5" handle="true">
        <ion-content>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ translate("SCAN COUNT") }}</p>
            3
            </ion-label>
            <ion-label slot="end" class="ion-text-end">
              <p class="overline">{{ translate("CONFIRMED COUNT") }}</p>
            2
            </ion-label>
          </ion-item>

          <ion-item lines="full" button detail>
            <ion-icon slot="start" :icon="warningOutline" color="danger" />
            <ion-label>3 {{ translate("unmatched") }}</ion-label>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Current") }}</ion-label>
          </ion-item-divider>

          <ion-list>
            <ion-item lines="full">
              <ion-label>Location seq id</ion-label>
            </ion-item>
          </ion-list>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Pending") }}</ion-label>
          </ion-item-divider>

          <ion-list>
            <ion-item v-for="n in 3" :key="n" lines="full">
              <ion-label>Location seq id {{ n + 1 }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>

    </ion-content>
    <ion-footer v-if="activeSegment === 'scan'">
      <ion-toolbar>
        <ion-button expand="block" fill="outline" class="ion-margin">
          {{ translate("SCAN NEXT LOCATION") }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
    <ion-footer v-else>
      <ion-toolbar>
        <div class="footer-actions ion-margin">
          <ion-button expand="block" fill="outline" color="warning">
            {{ translate("VOID SESSION") }}
          </ion-button>
          <ion-button expand="block" fill="outline" color="success">
            {{ translate("SUBMIT SESSION") }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonAccordion,
  IonAccordionGroup,
  IonBackButton, 
  IonButton, 
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonContent, 
  IonFooter, 
  IonHeader, 
  IonIcon, 
  IonItem, 
  IonItemDivider,
  IonLabel, 
  IonList, 
  IonListHeader,
  IonModal,
  IonNote, 
  IonPage, 
  IonSegment, 
  IonSegmentButton, 
  IonSegmentContent,
  IonSegmentView,
  IonThumbnail, 
  IonTitle, 
  IonToolbar,
  onIonViewDidEnter,
  onIonViewDidLeave
} from '@ionic/vue';
import { barcodeOutline, chevronUpCircleOutline, chevronDownCircleOutline, imageOutline, searchOutline, warningOutline } from 'ionicons/icons';
/* global defineProps */
import { ref } from 'vue';
import { translate } from '@/i18n';

const props = defineProps<{
  workEffortId: string;
  inventoryCountTypeId: string;
  inventoryCountImportId: string;
}>();

const activeSegment = ref('scan');
const isModalOpen = ref(false);

onIonViewDidEnter(() => {
  isModalOpen.value = true;
});

onIonViewDidLeave(() => {
  isModalOpen.value = false;
});
</script>

<style scoped>
.scan-input {
  --inner-padding-top: var(--spacer-base);
  --inner-padding-bottom: var(--spacer-base);
}

ion-item [slot="end"] ion-button {
  display: block;
}

.unmatched-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.footer-actions {
  display: flex;
  gap: var(--spacer-sm);
}

.footer-actions ion-button {
  flex: 1;
}

.timeline {
  --ion-safe-area-left: 0;
  --ion-safe-area-right: 0;
}

</style>
