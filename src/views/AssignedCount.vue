<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/drafts" />
        <ion-title>{{ translate("Assigned count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <div class="search ion-padding">
          <ion-item lines="none">
            <ion-label>
              <h1>CountName</h1> 
              <p>CountId</p>
            </ion-label>
            <ion-button slot="end" fill="outline" color="medium">Rename</ion-button>
          </ion-item>
          <ion-item lines="none">
            <ion-chip outline>
              <ion-icon :icon="calendarClearOutline"></ion-icon>
              <ion-label>3rd March 2024</ion-label>
            </ion-chip>
            <ion-chip outline>
              <ion-icon :icon="businessOutline"></ion-icon>
              <ion-label>Broadway</ion-label>
            </ion-chip>
          </ion-item>
        </div>
        <div class="filters ion-padding">
          <ion-list>
            <ion-item>
              <ion-spinner slot="start" name="circular" paused="true"/>
              <ion-label>{{ translate("Progress") }}</ion-label>
              <ion-label slot="end">{{ translate("40% complete") }}</ion-label>
            </ion-item>  
            <ion-item>
              <ion-spinner slot="start" name="circular" paused="true"/>
              <ion-label>{{ translate("Variance") }}</ion-label>
              <ion-label slot="end">13 counted | 20 expected</ion-label>
            </ion-item>  
          </ion-list>
        </div>
      </div>

      <hr/>

      <main>
        <div class="list-item border">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg size="small" />
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-label>
            3
            <p>QoH</p>
          </ion-label>

          <ion-chip outline>
            <ion-label>count pending</ion-label>
          </ion-chip>

          <div class="tablet">
            <ion-item lines="none">
              <ion-icon :icon="personCircleOutline" ></ion-icon>
            </ion-item>
          </div>

          <div class="tablet">
            <ion-button fill="clear" color="medium">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </div> 
        </div>

        <div class="list-item border">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg size="small" />
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-label>
            3
            <p>QoH</p>
          </ion-label>

          <ion-label>
            4
            <p>counted</p>
          </ion-label>

          <ion-label>
            +1
            <p>variance</p>
          </ion-label>

          <ion-chip outline>
            <ion-icon :icon="personCircleOutline"/>
            <ion-label> user.name </ion-label>
          </ion-chip>

          <div class="tablet">
            <ion-button fill="clear" color="medium" @click="openAssignedCountPopover($event)">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </div> 
        </div>
      </main>

    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { translate, DxpShopifyImg } from "@hotwax/dxp-components";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonThumbnail, IonTitle, IonToolbar, popoverController} from "@ionic/vue";
import AssignedCountPopover from "@/components/AssignedCountPopover.vue"

export default defineComponent({
  name: 'AssignedCount',
  components: {
  IonBackButton,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  DxpShopifyImg
  },

  methods: {
    async openAssignedCountPopover(Event){
      const popover = await popoverController.create({
        component: AssignedCountPopover,
        event: Event,
        showBackdrop: false,
      });
      await popover.present();
    },
  },

  setup() {
    return {
      translate,
      calendarClearOutline,
      businessOutline,
      personCircleOutline,
      ellipsisVerticalOutline,
    }
  }
})
</script>

<style scoped>
.border {
  border-bottom: var(--border-medium);
}

.list-item {
  --columns-desktop: 6;
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
}

.config-label {
  display: block;
  text-align: center;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
