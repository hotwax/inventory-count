<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count")}}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" :icon="checkboxOutline"/>
          </ion-button>
          <ion-button >
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
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
            <ion-button slot="end" fill="outline" color="medium">{{ translate("Rename") }}</ion-button>
          </ion-item>
          <ion-chip outline>
            <ion-icon :icon="calendarClearOutline"></ion-icon>
            <ion-label>3rd March 2024</ion-label>
          </ion-chip>
          <ion-chip outline>
            <ion-icon :icon="businessOutline"></ion-icon>
            <ion-label>Broadway</ion-label>
          </ion-chip>
        </div>
        <ion-list>
          <div class="filters ion-padding">
            <ion-item>
              <ion-spinner slot="start" name="circular" paused="true"/>
              <ion-label>{{ translate("Progress") }}</ion-label>
              <ion-label slot="end">40% complete</ion-label>
            </ion-item>  
            <ion-item>
              <ion-spinner slot="start" name="circular" paused="true"/>
              <ion-label>{{ translate("Variance") }}</ion-label>
              <ion-label slot="end">13 counted | 20 expected</ion-label>
            </ion-item> 
            <ion-item lines="none">
              <ion-icon slot="start" :icon="thermometerOutline"/>
              <ion-label>{{ translate("Item variance threshold") }}</ion-label>
              <ion-label slot="end">50%</ion-label>
            </ion-item>  
            <ion-item lines="none">
              <ion-range aria-label="Range"></ion-range>
            </ion-item>
          </div>
        </ion-list>
      </div>

      <div class="header">
          <ion-segment>
            <ion-segment-button>
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button>
              <ion-icon color="success" :icon="thermometerOutline"/>
            </ion-segment-button>
            <ion-segment-button>
              <ion-icon color="danger" :icon="thermometerOutline"/>
            </ion-segment-button>
          </ion-segment>
      </div>

      <hr/>

      <main>
        <div class="list-item">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-label>
            3
            <p>{{ translate("systemic") }}</p>
          </ion-label>

          <ion-item lines="none">
            <ion-label class="ion-text-center">
              <ion-badge color="danger">{{ translate("not counted") }}</ion-badge>
              <p>{{ translate("last counted 1 week ago") }}</p>
            </ion-label>  
          </ion-item>

          <div class="tablet">
            <ion-button fill="outline" color="success" size="small">
              <ion-icon slot="icon-only" :icon="thumbsUpOutline" color="success"></ion-icon>
            </ion-button>
            <ion-button fill="outline" color="warning" size="small" class="ion-margin-horizontal">
              <ion-icon slot="icon-only" :icon="refreshOutline" color="warning"></ion-icon>
            </ion-button>
            <ion-button fill="outline" color="danger" size="small">
              <ion-icon slot="icon-only" :icon="thumbsDownOutline" color="danger"></ion-icon>
            </ion-button>
          </div>
          
          <div>
            <ion-item lines="none">
              <ion-checkbox></ion-checkbox>
            </ion-item>
          </div>
        </div>

        <hr/>

        <div class="list-item">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-label>
            6/3
            <p>{{ translate("counted/systemic") }}</p>
          </ion-label>

          <ion-label>
            +1
            <p>user.name</p>
          </ion-label>  

          <div class="tablet">
            <ion-button fill="outline" color="success" size="small">
              <ion-icon slot="icon-only" :icon="thumbsUpOutline" color="success"></ion-icon>
            </ion-button>
            <ion-button fill="outline" color="warning" size="small" class="ion-margin-horizontal">
              <ion-icon slot="icon-only" :icon="refreshOutline" color="warning"></ion-icon>
            </ion-button>
            <ion-button fill="outline" color="danger" size="small">
              <ion-icon slot="icon-only" :icon="thumbsDownOutline" color="danger"></ion-icon>
            </ion-button>
          </div>
          
          <div>
            <ion-item lines="none">
              <ion-checkbox></ion-checkbox>
            </ion-item>
          </div>
        </div>
        <hr/>
      </main>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="success" size="small">
            <ion-icon slot="icon-only" color="success" :icon="thumbsUpOutline"/>
          </ion-button>
          <ion-button fill="outline" color="warning" size="small" class="ion-margin-horizontal">
            <ion-icon slot="icon-only" color="warning" :icon="refreshOutline" />
          </ion-button>
          <ion-button fill="outline" color="danger" size="small">
            <ion-icon slot="icon-only" color="danger" :icon="thumbsDownOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline, thermometerOutline, thumbsUpOutline, refreshOutline, thumbsDownOutline, checkboxOutline, addOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButtons, IonButton, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonRange, IonSegment, IonSegmentButton, IonSpinner, IonThumbnail, IonTitle, IonToolbar, popoverController} from "@ionic/vue";
import { translate } from '@/i18n'
import AssignedCountPopover from "@/components/AssignedCountPopover.vue"

export default defineComponent({
  name: 'PendingReviewDetail',
  components: {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRange,
  IonSegment,
  IonSegmentButton,
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
      thermometerOutline,
      thumbsUpOutline,
      refreshOutline,
      thumbsDownOutline,
      checkboxOutline,
      addOutline
    }
  }
})
</script>

<style scoped>
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


@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
