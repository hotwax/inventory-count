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
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">sku</ion-label>
            <ion-input placeholder="Scan a barcode"></ion-input>
          </ion-item>

          <ion-button expand="block" color="success" class="focus ion-margin-top ion-margin-horizontal">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            start counting
          </ion-button>

          <ion-item lines="none" class="empty ion-margin-top">
            <ion-label>
              Items you scan or count will show on this list. Focus your scanner on the input field to begin.
            </ion-label>
          </ion-item>

          <div class="events">
            <ion-list>
              <ion-item v-for="n in 50" :key="n">
                <ion-thumbnail slot="start"> <dxp-image></dxp-image> </ion-thumbnail>
                <ion-label>
                  Primary identifier
                  <p>Secondary identifier</p>
                </ion-label>
                <ion-note slot="end">
                  30 seconds ago
                </ion-note>
              </ion-item>
            </ion-list>
          </div>

          <ion-card class="add-pre-counted" href="">
            <ion-item lines="none">
              <ion-label class="ion-text-nowrap">Add pre-counted items</ion-label>
              <ion-icon slot="end" :icon="addOutline"></ion-icon>
            </ion-item>
          </ion-card>
        </div>
        
        <div class="count-dashboard">
          <div class="header ion-padding">
            <ion-item lines="none">
              <ion-label>
                <p class="overline">Hard count</p>
                <h1>Accessories - Register</h1>
                <p>Created by user login</p>
              </ion-label>
            </ion-item>
            <ion-button color="warning" fill="outline">
              <ion-icon slot="start" :icon="exitOutline"></ion-icon>
              Discard session
            </ion-button>
            <ion-button color="success" fill="outline">
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
                  <p class="big-number">72</p>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>
                    Pending match scans
                  </ion-label>
                  <p slot="end">
                    0
                  </p>
                </ion-item>
                <ion-item>
                  <ion-label>
                    Unmatched scans
                  </ion-label>
                  <p slot="end">
                    0
                  </p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">Units counted</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">200</p>
                <ion-button color="primary" fill="clear">
                  <ion-icon slot="icon-only" :icon="timerOutline"></ion-icon>
                </ion-button>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>
                    Lap 2
                  </ion-label>
                  <p slot="end">
                    15
                  </p>
                </ion-item>
                <ion-item>
                  <ion-label>
                    Lap 1
                  </ion-label>
                  <p slot="end">
                    10
                  </p>
                </ion-item>
              </ion-list>
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
                    <h2>10022001922</h2>
                    <p>10 scans ago</p>
                    <p>3 minutes ago</p>
                  </ion-label>
                  <ion-button slot="end" fill="outline">
                    <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                    Match
                  </ion-button>
                </ion-item>
                <ion-list>
                  <ion-item>
                    <ion-thumbnail slot="start">
                      <dxp-image></dxp-image>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">3 scans ago</p>
                      Primary Id
                      <p>secondary Id</p>
                      <p>scanned value</p>
                    </ion-label>
                    <ion-note slot="end">
                      last match
                    </ion-note>
                    <ion-icon :icon="chevronUpCircleOutline" slot="end"></ion-icon>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <dxp-image></dxp-image>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">3 scans ago</p>
                      Primary Id
                      <p>secondary Id</p>
                      <p>scanned value</p>
                    </ion-label>
                    <ion-note slot="end">
                      last match
                    </ion-note>
                    <ion-icon :icon="chevronDownCircleOutline" slot="end"></ion-icon>
                  </ion-item>
                </ion-list>
              </ion-card>
            </ion-segment-content>
            <ion-segment-content id="counted" class="cards">
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
          </ion-segment-view>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSegmentContent,
  IonSegmentView,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { addOutline, barcodeOutline, checkmarkDoneOutline, chevronDownCircleOutline, chevronUpCircleOutline, exitOutline, searchOutline, timerOutline } from 'ionicons/icons';
import { defineProps } from 'vue';
const props = defineProps(["id"]);


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