<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ translate("Count name") }}</ion-title>
        <ion-segment :value="selectedSegment">
          <ion-segment-button value="assigned" @click="selectedSegment = 'assigned'">
            <ion-label>{{ translate("Assigned") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="pendingReview" @click="selectedSegment = 'pendingReview'">
            <ion-label>{{ translate("Pending review") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="closed" @click="selectedSegment = 'closed'">
            <ion-label>{{ translate("Closed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section v-if="selectedSegment === 'assigned'">  
          <ion-card @click="navigateToStoreView">
            <ion-card-header>
              <ion-card-title>
                Count Name
                <ion-label>
                  <p>created date</p>
                </ion-label>
              </ion-card-title>
              <ion-note>10 items</ion-note>
            </ion-card-header>
            <ion-item lines="none">
              {{ translate("Due date") }}
              <ion-label slot="end">
                <p>2nd July 2024</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <div>
                <ion-label overline color="danger">
                  {{ translate("Recount requested")}}
                </ion-label>
                <ion-card-title>
                  Count Name
                  <ion-label>
                    <p>created date</p>
                  </ion-label>
                </ion-card-title>
              </div>
              <ion-note>10 items</ion-note>
            </ion-card-header>
            <ion-item lines="none">
              {{ translate("Due date") }}
              <ion-label slot="end">
                <p>2nd July 2024</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </section>

        <section v-if="selectedSegment === 'pendingReview'">  
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                Count Name
                <ion-label>
                  <p>created date</p>
                </ion-label>
              </ion-card-title>
              <ion-note>9/10 items counted</ion-note>
            </ion-card-header>
            <ion-item>
              {{ translate("Due date") }}
              <ion-label slot="end">
                <p>2nd July 2024</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              {{ translate("Submission date") }}
              <ion-label slot="end">
                <p>1st July 2024</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </section>

        <section v-if="selectedSegment === 'closed'">  
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                Count Name
                <ion-label>
                  <p>created date</p>
                </ion-label>
              </ion-card-title>
              <ion-note>9/10 items counted</ion-note>
            </ion-card-header>
            <div class="header">
              <div class="search">
                <ion-item>
                  {{ translate("Due date") }}
                  <ion-label slot="end">
                    <p>2nd July 2024</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  {{ translate("Submission date") }}
                  <ion-label slot="end">
                    <p>1st July 2024</p>
                  </ion-label>
                </ion-item>
                <ion-item lines="none">
                  {{ translate("Closed date") }}
                  <ion-label slot="end">
                    <p>1st July 2024</p>
                  </ion-label>
                </ion-item>
              </div>
              <div class="filters">
                <ion-item>
                  {{ translate("Rejected") }}
                  <ion-label slot="end">
                    <p>4</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  {{ translate("Total variance") }}
                  <ion-label slot="end">
                    <p>2</p>
                  </ion-label>
                </ion-item>
              </div>
            </div>
          </ion-card>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { translate } from '@/i18n';
import { defineComponent } from "vue";
import { useRouter } from 'vue-router'

export default defineComponent({
  name: "Count",
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      selectedSegment: 'assigned',
    }
  },  
  methods: {
    navigateToStoreView() {
      this.router.push('/count-detail');
    }
  },
  setup() {
    const router = useRouter();

    return {
      router,
      translate,
    };
  }
});
</script>

<style scoped>

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}
.search {
  grid-area: search;
  border-right: 1px solid #ccc;
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


