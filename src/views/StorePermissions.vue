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
        <ion-card v-for="permission in permissionCards" :key="permission.id">
          <ion-card-header>
            <ion-card-title>
              {{ translate(permission.title) }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ translate(permission.description) }}</p>
          </ion-card-content>
          <ion-list>
            <ion-item-divider color="light">
              {{ translate('Security groups') }}
              <ion-button v-if="(activeGroupsByPermission[permission.id] || []).length" slot="end" fill="clear" size="small" @click="openSelectGroupsModal(permission)">
                {{ translate('Add') }}
                <ion-icon slot="end" :icon="addCircleOutline"></ion-icon>
              </ion-button>
            </ion-item-divider>
            <ion-button v-if="!(activeGroupsByPermission[permission.id] || []).length" fill="outline" expand="block" class="ion-margin" @click="openSelectGroupsModal(permission)">
              <ion-icon slot="start" :icon="addOutline"></ion-icon>
              {{ translate('Add security group') }}
            </ion-button>

            <ion-item button @click="openHistory(permission)">
              <ion-label>{{ translate('View history') }}</ion-label>
              <ion-icon slot="end" :icon="timeOutline"></ion-icon>
            </ion-item>

            <ion-item v-for="group in activeGroupsByPermission[permission.id]" :key="group.groupId">
              <ion-label>
                {{ group.groupName || group.groupId }}
                <p>{{ group.groupId }}</p>
              </ion-label>
              <ion-button color="medium" fill="clear" slot="end" @click="openGroupActionsPopover(permission.id, group, $event)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card>
      </div>

      <!-- History modal -->
      <ion-modal :is-open="isHistoryModalOpen" @didDismiss="closeHistoryModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeHistoryModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>
              {{ translate("Security group history") }}
              <template v-if="historyPermissionTitle">
                - {{ historyPermissionTitle }}
              </template>
            </ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list v-if="historyRecords.length">
            <ion-item v-for="record in historyRecords" :key="`${record.groupId}-${record.fromDate}`">
              <ion-label>
                {{ record.groupName || record.groupId }}
                <p>{{ record.groupId }}</p>
              </ion-label>
              <ion-note slot="end">
                {{ getDateTime(record.fromDate) }}
                -
                {{
                  record.thruDate ? getDateTime(record.thruDate) : translate("Current")
                }}
              </ion-note>
            </ion-item>
          </ion-list>
          <div v-else class="empty-state">
            <p>{{ translate("No history found.") }}</p>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Select security groups modal -->
      <ion-modal :is-open="isSelectGroupsModalOpen" @didDismiss="closeSelectGroupsModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeSelectGroupsModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select security groups") }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-searchbar :placeholder="translate('Search security groups')" v-model="modalQuery"/>

          <template v-if="filteredSecurityGroups.length">
            <ion-list>
              <ion-item v-for="securityGroup in filteredSecurityGroups" :key="securityGroup.groupId">
                <ion-checkbox :checked="isGroupSelected(securityGroup.groupId)" @ionChange="toggleGroupSelection(securityGroup)">
                  <ion-label>
                    {{ securityGroup.groupName || securityGroup.groupId }}
                    <p>{{ securityGroup.groupId }}</p>
                  </ion-label>
                </ion-checkbox>
              </ion-item>
            </ion-list>
          </template>

          <div v-else class="empty-state">
            <p>{{ translate("No security groups found") }}</p>
          </div>

          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button @click="saveSelectedSecurityGroups">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>

      <!-- Security group actions popover -->
      <ion-popover :is-open="groupActionsPopoverState.isOpen" :event="groupActionsPopoverState.event" @didDismiss="closeGroupActionsPopover">
        <ion-content>
          <ion-list v-if="groupActionsPopoverState.group">
            <ion-list-header>
              {{
                groupActionsPopoverState.group.groupName ||
                groupActionsPopoverState.group.groupId
              }}
            </ion-list-header>
            <ion-item>
              <ion-label>
                {{ getDateTime(groupActionsPopoverState.group.fromDate) }}
                <p>{{ translate("added to group") }}</p>
              </ion-label>
            </ion-item>
            <ion-item button @click="confirmRemoveGroupFromPermission" lines="none">
              {{ translate("Remove") }}
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-popover>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonModal, IonNote, IonPage, IonPopover, IonSearchbar, IonTitle, IonToolbar, alertController, onIonViewWillEnter } from "@ionic/vue";
import { ref, computed } from "vue";
import { DateTime } from "luxon";
import { translate } from "@/i18n";
import { useProductStore } from "@/stores/productStore";
import { showToast } from "@/services/uiUtils";
import logger from "@/logger";

import { storefrontOutline, addCircleOutline, addOutline, timeOutline, ellipsisVerticalOutline, closeOutline, saveOutline } from "ionicons/icons";
import { hasError } from "@/stores/authStore";
import { useUserProfile } from "@/stores/userProfileStore";

type PermissionMeta = {
  id: string;
  title: string;
  description: string;
};

const productStore = useProductStore();

/**
 * Permission cards configuration
 */
const permissionCards: PermissionMeta[] = [
  {
    id: "INVCOUNT_APP_VIEW",
    title: "Access inventory counts",
    description:
      "Select security groups that can access the inventory count app store view and create counts in sessions. This does not allow them to impact inventory.",
  },
  {
    id: "INV_CNT_VIEW_QOH",
    title: "View quantity on hand",
    description:
      "Select security groups that can view the current quantity on hand for products during counting.",
  },
  {
    id: "PREVIEW_COUNT_ITEM",
    title: "Preview count",
    description:
      "Select security groups that can preview products in a directed count before the start time.",
  },
  {
    id: "INV_COUNT_PRE_START",
    title: "Start count early",
    description:
      "Select security groups that can start a cycle count at a store before the designated start time.",
  },
  {
    id: "INV_COUNT_SUBMIT",
    title: "Submit cycle count for review",
    description:
      "Select security groups that can approve sessions and then submit proposed count variances for review. This will now allow them to apply variances to their inventory.",
  },
  {
    id: "INV_COUNT_LOCK_RLS",
    title: "Force release session",
    description:
      "Select security groups that can forcefully release sessions that are not their own. The force released device will be booted from their session within 30 seconds.",
  },
  {
    id: "INV_COUNT_ADMIN",
    title: "Inventory count admin",
    description:
      "Select security groups that can perform all cycle count functions without any restrictions including start counts early, submit cycle counts for review and accept and reject variances. This permission is required to access the cycle count admin pages.",
  },
];

const activeGroupsByPermission = ref<Record<string, any[]>>({});

// History modal state
const isHistoryModalOpen = ref(false);
const historyRecords = ref<any[]>([]);
const historyPermission = ref<PermissionMeta | null>(null);

// Select-groups modal state
const isSelectGroupsModalOpen = ref(false);
const selectGroupsPermission = ref<PermissionMeta | null>(null);
const allSecurityGroupsForPermission = ref<any[]>([]);
const modalQuery = ref("");
const modalSelectedGroups = ref<any[]>([]);
const modalOriginalSelectedGroups = ref<any[]>([]);

// Popover state
const groupActionsPopoverState = ref<{
  isOpen: boolean;
  event: any | null;
  permissionId: string | null;
  group: any | null;
}>({
  isOpen: false,
  event: null,
  permissionId: null,
  group: null,
});

/**
 * Lifecycle
 */
onIonViewWillEnter(async () => {
  await productStore.getSettings(productStore.getCurrentProductStore.productStoreId);

  // get active groups for all permissions in parallel
  await Promise.all(
    permissionCards.map((permission) => getActiveGroups(permission.id))
  );
});

function getDateTime(time: any) {
  if (!time) return "";
  const millis =
    typeof time === "string" ? parseInt(time as string, 10) : (time as number);
  return DateTime.fromMillis(millis).toLocaleString(DateTime.DATETIME_MED);
}

const historyPermissionTitle = computed(() =>
  historyPermission.value ? translate(historyPermission.value.title) : ""
);

/**
 * get active security groups for a permission (filterByDate = true)
 */
async function getActiveGroups(permissionId: string) {
  try {
    const resp = await useUserProfile().getSecurityGroupAndPermissions({
      permissionId,
      filterByDate: true,
      groupTypeEnumId: "PRM_CLASS_TYPE",
      groupTypeEnumId_op: "equals",
      groupTypeEnumId_not: 'Y',
    });
    if (hasError(resp)) throw resp?.data;
    const docs = (resp?.data && (resp.data.entityValueList)) || [];
    activeGroupsByPermission.value[permissionId] = docs;
  } catch (error) {
    logger.error(error);
    activeGroupsByPermission.value[permissionId] = [];
  }
}

/**
 * History modal handlers
 */
async function openHistory(permission: PermissionMeta) {
  historyPermission.value = permission;
  try {
    const resp = await useUserProfile().getSecurityGroupAndPermissions({
      permissionId: permission.id,
      filterByDate: false,
      orderByField: "-thruDate",
      groupTypeEnumId: "PRM_CLASS_TYPE",
      groupTypeEnumId_op: "equals",
      groupTypeEnumId_not: 'Y',
      pageSize: 250,
    });
    if (hasError(resp)) throw resp?.data;
    const docs = (resp?.data && (resp.data.entityValueList)) || [];
    historyRecords.value = docs;
  } catch (error) {
    logger.error(error);
    historyRecords.value = [];
  }
  isHistoryModalOpen.value = true;
}

function closeHistoryModal() {
  isHistoryModalOpen.value = false;
}

/**
 * Select security groups modal handlers
 */
async function openSelectGroupsModal(permission: PermissionMeta) {
  selectGroupsPermission.value = permission;
  modalQuery.value = "";

  // Original selection = current active groups
  const currentActive = activeGroupsByPermission.value[permission.id] || [];
  modalOriginalSelectedGroups.value = currentActive.map((g: any) => ({
    groupId: g.groupId,
    groupName: g.groupName,
    fromDate: g.fromDate,
  }));

  try {
    // Get all security groups that have ever been associated with this permission
    const resp = await useUserProfile().getSecurityGroupAndPermissions({
      // permissionId: permission.id,
      filterByDate: false,
      fieldsToSelect: "groupId,groupName",
      groupTypeEnumId: "PRM_CLASS_TYPE",
      groupTypeEnumId_op: "equals",
      groupTypeEnumId_not: 'Y',
      distinct: "true",
      pageSize: 250,
    });
    if (hasError(resp)) throw resp?.data;
    const docs = (resp?.data && (resp.data.entityValueList)) || [];

    const seen = new Set<string>();
    const allGroups: any[] = [];
    docs.forEach((doc: any) => {
      if (!seen.has(doc.groupId)) {
        seen.add(doc.groupId);
        allGroups.push({
          groupId: doc.groupId,
          groupName: doc.groupName,
        });
      }
    });
    allSecurityGroupsForPermission.value = allGroups;
  } catch (error) {
    logger.error(error);
    allSecurityGroupsForPermission.value = [];
  }

  // Initial selection = active groups
  modalSelectedGroups.value = [...modalOriginalSelectedGroups.value];
  isSelectGroupsModalOpen.value = true;
}

function closeSelectGroupsModal() {
  isSelectGroupsModalOpen.value = false;
}

const filteredSecurityGroups = computed(() => {
  const query = modalQuery.value.trim().toLowerCase();
  if (!query) return allSecurityGroupsForPermission.value;

  return allSecurityGroupsForPermission.value.filter((group: any) => {
    const idMatch = group.groupId
      .toLowerCase()
      .includes(query.toLowerCase());
    const nameMatch =
      group.groupName &&
      group.groupName.toLowerCase().includes(query.toLowerCase());
    return idMatch || nameMatch;
  });
});

function isGroupSelected(securityGroupId: string) {
  return modalSelectedGroups.value.some(
    (securityGroup: any) => securityGroup.groupId === securityGroupId
  );
}

function toggleGroupSelection(updatedSecurityGroup: any) {
  const exists = modalSelectedGroups.value.some(
    (group: any) => group.groupId === updatedSecurityGroup.groupId
  );
  if (exists) {
    modalSelectedGroups.value = modalSelectedGroups.value.filter(
      (group: any) => group.groupId !== updatedSecurityGroup.groupId
    );
  } else {
    modalSelectedGroups.value.push(updatedSecurityGroup);
  }
}

async function saveSelectedSecurityGroups() {
  if (!selectGroupsPermission.value) return;

  const permissionId = selectGroupsPermission.value.id;
  const originalIds = modalOriginalSelectedGroups.value.map(
    (g: any) => g.groupId
  );
  const currentIds = modalSelectedGroups.value.map((g: any) => g.groupId);

  const groupsToCreateIds = currentIds.filter(
    (id: string) => !originalIds.includes(id)
  );
  const groupsToRemoveIds = originalIds.filter(
    (id: string) => !currentIds.includes(id)
  );

  try {
    // Create new SecurityGroupPermission records
    for (const groupId of groupsToCreateIds) {
      const payload = {
        groupId,
        permissionId,
        fromDate: Date.now(),
      };
      const resp = await useUserProfile().createSecurityGroupPermission(payload);
      if (hasError(resp)) throw resp?.data;
    }

    // Expire removed SecurityGroupPermission associations
    for (const groupId of groupsToRemoveIds) {
      const original = modalOriginalSelectedGroups.value.find(
        (g: any) => g.groupId === groupId
      );
      const payload: any = {
        groupId,
        permissionId,
        thruDate: Date.now(),
      };
      if (original?.fromDate) {
        payload.fromDate = original.fromDate;
      }

      const resp = await useUserProfile().updateSecurityGroupPermission(payload);
      if (hasError(resp)) throw resp?.data;
    }

    showToast(translate("Security groups updated successfully."));

    // Refresh active groups for this permission
    await getActiveGroups(permissionId);

    isSelectGroupsModalOpen.value = false;
  } catch (error) {
    logger.error(error);
    showToast(translate("Something went wrong."));
  }
}

/**
 * Popover handlers (date added + remove)
 */
function openGroupActionsPopover(permissionId: string, group: any, ev: any) {
  groupActionsPopoverState.value = {
    isOpen: true,
    event: ev,
    permissionId,
    group,
  };
}

function closeGroupActionsPopover() {
  groupActionsPopoverState.value = {
    isOpen: false,
    event: null,
    permissionId: null,
    group: null,
  };
}

async function confirmRemoveGroupFromPermission() {
  const state = groupActionsPopoverState.value;
  if (!state.group || !state.permissionId) return;

  const permissionId = state.permissionId;
  const group = state.group;

  const alert = await alertController.create({
    header: translate("Remove security group"),
    message: translate(
      "Removing this security group may limit access to certain features or data. Are you sure you want to continue?"
    ),
    buttons: [
      {
        text: translate("Keep Group"),
        role: "cancel",
      },
      {
        text: translate("Remove"),
        handler: async () => {
          try {
            const payload: any = {
              groupId: group.groupId,
              permissionId,
              thruDate: Date.now(),
            };
            if (group.fromDate) {
              payload.fromDate = group.fromDate;
            }

            const resp = await useUserProfile().updateSecurityGroupPermission(payload);
            if (hasError(resp)) throw resp?.data;

            showToast(translate("Security group removed successfully."));

            await getActiveGroups(permissionId);
          } catch (error) {
            logger.error(error);
            showToast(translate("Something went wrong."));
          } finally {
            closeGroupActionsPopover();
          }
        },
      },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(325px, 1fr));
  align-items: start;
}
.empty-state {
  text-align: center;
  padding: 16px;
  color: var(--ion-color-medium);
}
</style>
