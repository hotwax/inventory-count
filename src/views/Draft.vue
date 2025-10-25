<template>
    <ion-page>
        <ion-header>
        <ion-toolbar>
            <ion-title>{{ translate("Draft")}}</ion-title>
        </ion-toolbar>
        </ion-header>
        <ion-content>
            <p v-if="!cycleCounts.length" class="empty-state">
                {{ translate("No cycle counts found") }}
            </p>
            <ion-list v-else class="list">
                <ion-item lines="full" v-for="count in cycleCounts" :key="count.workEffortId" button detail>
                    <ion-label>
                        <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
                        {{ count.workEffortName }}
                    </ion-label>
                </ion-item>
            </ion-list>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import { translate, useUserStore } from '@hotwax/dxp-components';
import { IonPage, IonHeader, IonContent, onIonViewDidEnter, IonList, IonLabel } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'

const isLoading = ref(false);
const store = useStore();
const router = useRouter()
const userStore = useUserStore();

const cycleCounts = computed(() => store.getters["count/getDraftWorkEfforts"]);

onIonViewDidEnter(async () => {
    isLoading.value = true;
    fetchCycleCounts();
    isLoading.value = false;
});

async function fetchCycleCounts(vSize?: any, vIndex?: any) {
    const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
    const pageIndex = vIndex ? vIndex : 0;
    const payload = {
        pageSize,
        pageIndex,
        currentStatusId: "CYCLE_CNT_CREATED"
    };
    await store.dispatch("count/getCycleCounts", payload);
}
</script>

<style scoped>
.list {
  padding: 6px 70px 0 70px;
}
</style>