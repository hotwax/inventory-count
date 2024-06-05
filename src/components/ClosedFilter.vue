<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item-divider>
          <ion-label>{{ translate("Facility") }}</ion-label>
        </ion-item-divider>
        <ion-item>
          <ion-icon slot="start" :icon="businessOutline"/>
          <ion-select interface="popover" placeholder="All">
            <div slot="label">{{ translate("Facility") }}</div>
            <ion-select-option>Facility-1</ion-select-option>
            <ion-select-option>Facility-2</ion-select-option>
            <ion-select-option>Facility-3</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item button>
          <ion-icon slot="start" :icon="removeCircleOutline"/>
          <ion-checkbox>
            <ion-label>{{ translate("No facility") }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <ion-item-divider>
          <ion-label>{{ translate("Date") }}</ion-label>
        </ion-item-divider>
        
        <ion-accordion-group>
          <ion-accordion>
            <ion-item slot="header">
              <ion-icon slot="start" :icon="gitBranchOutline"/>
              <ion-label class="ion-text-wrap">{{ translate("Created") }}</ion-label>
            </ion-item>
            <div slot="content">
              <ion-item>
                <ion-label>Before</ion-label>
                <ion-button color="light" fill="solid">DATE</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>After</ion-label>
                <ion-button color="light" fill="solid">DATE</ion-button>
              </ion-item>
            </div>
          </ion-accordion>

          <ion-accordion>
            <ion-item slot="header" lines="full">
              <ion-icon slot="start" :icon="gitPullRequestOutline"/>
              <ion-label class="ion-text-wrap">{{ translate("Closed") }}</ion-label>
            </ion-item>
            <div slot="content">
              <ion-item>
                <ion-label>Before</ion-label>
                <ion-button color="light" fill="solid">DATE</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>After</ion-label>
                <ion-button color="light" fill="solid">DATE</ion-button>
              </ion-item>
            </div>
          </ion-accordion>
          
        </ion-accordion-group>
      </ion-list>
    </ion-content> 
  </ion-menu>
</template>

<script lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonMenu,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { removeCircleOutline, businessOutline, gitBranchOutline, gitPullRequestOutline } from "ionicons/icons";
import { translate } from '@/i18n'

export default defineComponent({
  name: "ClosedFilters",
  components: {
    IonAccordion,
    IonAccordionGroup,
    IonButton,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonMenu,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },

  setup() {    
    return {
      removeCircleOutline,
      businessOutline,
      gitBranchOutline,
      gitPullRequestOutline,
      translate
    };
  },
});
</script>