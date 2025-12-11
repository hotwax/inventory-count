
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Store permissions") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="permission-cards"> 
        <ion-card>
          <ion-item button detail lines="full" :router-link="'/tabs/count'">
            <ion-icon size="medium" :icon="storefrontOutline" class="ion-margin-end"></ion-icon>
            <ion-label>
              {{ translate("Store View") }}
            </ion-label>
          </ion-item>
        </ion-card>
      </div>
      <div class="permission-cards">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Quantity on hand') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ translate("Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.") }}</p>
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle :checked="useProductStore().getShowQoh" @click.prevent="updateProductStoreSetting($event, 'showQoh')">
              {{ translate("Show systemic inventory") }}
            </ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Preview count') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ translate("Select security groups that can preview products in a directed count before the start time.") }}</p>
          </ion-card-content>
          <ion-list>
            <ion-item-divider color="light">
              {{ translate('Security groups') }}
              <ion-button slot="end" fill="clear" size="small">
                {{ translate('Add') }}
                <ion-icon slot="end" :icon="addCircleOutline"></ion-icon>
              </ion-button>
            </ion-item-divider>
            <ion-button fill="outline" expand="block" class="ion-margin">
              <ion-icon slot="start" :icon="addOutline"></ion-icon>
              {{ translate('Add security group') }}
            </ion-button>
            <ion-item button>
              <ion-label>{{ translate('View history') }}</ion-label>
              <ion-icon slot="end" :icon="timeOutline"></ion-icon>
            </ion-item>
            <ion-item>
              <ion-label>Security group description</ion-label>
              <ion-button color="medium" fill="clear" slot="end" id="security-group-popover-trigger">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
              </ion-button>
            </ion-item>
            <ion-popover trigger="security-group-popover-trigger" :dismiss-on-select="true">
              <ion-content>
                <ion-list>
                  <ion-item button :detail="false">
                    <ion-label>
                      Date added
                      <p>added to group</p>
                    </ion-label>
                  </ion-item>
                  <ion-item button :detail="false">
                    <ion-label>{{ translate('Remove') }}</ion-label>
                  </ion-item>
                </ion-list>
              </ion-content>
            </ion-popover>
          </ion-list>
        </ion-card>
      </div>
    </ion-content> 
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonList,
  IonPage,
  IonPopover,
  IonTitle,
  IonToggle,
  IonToolbar,
  IonLabel,
  IonIcon,
  onIonViewWillEnter
} from "@ionic/vue";
import { translate } from '@/i18n'
import { useProductStore } from "@/stores/productStore";
import {
  storefrontOutline,
  addCircleOutline,
  addOutline,
  timeOutline,
  ellipsisVerticalOutline
} from "ionicons/icons";

onIonViewWillEnter(async () => {
  await useProductStore().getSettings(useProductStore().getCurrentProductStore.productStoreId)
})

function updateProductStoreSetting(event: any, key: string) {
  useProductStore().setProductStoreSetting(key, !useProductStore().getShowQoh, useProductStore().getCurrentProductStore.productStoreId);
}

</script>

<style scoped>
.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(325px, 1fr));
  align-items: start;
}
</style>
