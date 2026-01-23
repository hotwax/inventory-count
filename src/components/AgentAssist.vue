<template>
  <div class="agent-fab">
    <ion-button class="agent-fab-button" color="secondary" @click="openModal">
      <ion-icon :icon="chatbubbleEllipsesOutline" slot="start" />
      <ion-label>{{ translate('Ask agent') }}</ion-label>
    </ion-button>
  </div>

  <ion-modal :is-open="isOpen" @didDismiss="closeModal" class="agent-modal">
    <ion-header>
      <ion-toolbar class="agent-header">
        <ion-title class="agent-title">
          <div class="agent-title-row">
            <span>{{ translate('Ask agent') }}</span>
            <span class="agent-status" :class="isSending ? 'agent-status--busy' : 'agent-status--ready'">
              <span class="agent-status-dot"></span>
              <span>{{ isSending ? translate('Thinking...') : translate('Online') }}</span>
            </span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="closeModal">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="agent-content">
      <div class="agent-thread">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="agent-message"
          :class="message.role === 'user' ? 'agent-message--user' : 'agent-message--assistant'"
        >
          <div class="agent-meta">
            {{ message.role === 'user' ? translate('You') : translate('Agent') }}
          </div>
          <div class="agent-bubble">{{ message.text }}</div>
        </div>
        <div v-if="isSending" class="agent-message agent-message--assistant">
          <div class="agent-meta">{{ translate('Agent') }}</div>
          <div class="agent-bubble agent-bubble--thinking">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-label">{{ translate('Thinking') }}</span>
          </div>
        </div>
      </div>
      <div v-if="actionSuggestions.length" class="agent-actions-panel">
        <div class="agent-actions-title">{{ translate('Suggested actions') }}</div>
        <div v-for="suggestion in actionSuggestions" :key="suggestion.id" class="agent-action-card">
          <div class="agent-action-label">{{ suggestion.label }}</div>
          <div v-if="suggestion.message" class="agent-action-message">
            {{ suggestion.message }}
          </div>
          <div class="agent-action-buttons">
            <template v-if="suggestion.type === 'remove_scan'">
              <ion-button
                size="small"
                :disabled="suggestion.status === 'running' || suggestion.status === 'done' || !suggestion.identifier"
                @click="runAction(suggestion, 'one')"
              >
                {{ translate('Remove 1 qty') }}
              </ion-button>
              <ion-button
                size="small"
                fill="outline"
                :disabled="suggestion.status === 'running' || suggestion.status === 'done' || !suggestion.identifier"
                @click="runAction(suggestion, 'all')"
              >
                {{ translate('Remove all qty') }}
              </ion-button>
            </template>
            <template v-else>
              <ion-button
                size="small"
                :disabled="suggestion.status === 'running' || (!suggestion.identifier && suggestion.type !== 'match_unmatched') || suggestion.status === 'done'"
                @click="runAction(suggestion)"
              >
                <span v-if="suggestion.status !== 'running'">
                  {{ translate('Find matches') }}
                </span>
                <span v-else>{{ translate('Working...') }}</span>
              </ion-button>
            </template>
          </div>
          <div v-if="suggestion.options?.length" class="agent-action-options">
            <ion-button
              v-for="option in suggestion.options"
              :key="option.productId"
              size="small"
              fill="outline"
              @click="matchUnmatchedItem(suggestion, option.productId)"
            >
              {{ translate('Match') }} {{ option.label || option.productId }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-footer class="agent-footer">
      <div class="agent-input">
        <ion-textarea
          v-model="prompt"
          :placeholder="translate('Ask about counts, missing SKUs, or import issues')"
          auto-grow
          enterkeyhint="send"
          @keydown="onPromptKeydown"
        />
        <ion-button :disabled="!canSend" @click="sendPrompt">
          <ion-icon :icon="sendOutline" />
        </ion-button>
      </div>

      <ion-item lines="none" class="agent-context-toggle">
        <ion-label>{{ translate('Include local context') }}</ion-label>
        <ion-toggle v-model="includeContext" />
      </ion-item>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import type { HTMLIonContentElement } from '@ionic/core/components';
import { chatbubbleEllipsesOutline, closeOutline, sendOutline } from 'ionicons/icons';
import { computed, nextTick, ref } from 'vue';
import { useRoute } from 'vue-router';
import { askInventoryAgent } from '@/services/AgentAPI';
import { buildAgentContext } from '@/services/agentContext';
import { db } from '@/services/appInitializer';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { useProductMaster } from '@/composables/useProductMaster';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useUserProfile } from '@/stores/userProfileStore';
import { inventorySyncWorker } from '@/workers/workerInitiator';
import { showToast } from '@/services/uiUtils';
import { translate } from '@/i18n';

const route = useRoute();
const isOpen = ref(false);
const isSending = ref(false);
const includeContext = ref(true);
const prompt = ref('');
const messages = ref<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
const contentRef = ref<InstanceType<typeof IonContent> | null>(null);
const actionSuggestions = ref<
  Array<{
    id: string;
    type: 'remove_scan' | 'match_unmatched';
    identifier: string;
    label: string;
    status: 'idle' | 'running' | 'done' | 'error';
    message?: string;
    options?: Array<{ productId: string; label: string }>;
    unmatchedItem?: any;
  }>
>([]);

const canSend = computed(() => !isSending.value && !!prompt.value.trim());

const openModal = () => {
  isOpen.value = true;
};

const closeModal = () => {
  isOpen.value = false;
  actionSuggestions.value = [];
};

const formatResponse = (response: { text?: string; data?: unknown }) => {
  if (response.text && response.text.trim()) return response.text;
  if (response.data) return JSON.stringify(response.data, null, 2);
  return translate('No response received.');
};

const extractIdentifier = (input: string) => {
  const quoted = input.match(/['"`]{1}([^'"`]{2,})['"`]{1}/);
  if (quoted?.[1]) return quoted[1].trim();

  const identifierMatch = input.match(/identifier\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (identifierMatch?.[1]) return identifierMatch[1].trim();

  const skuMatch = input.match(/sku\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (skuMatch?.[1]) return skuMatch[1].trim();

  const upcMatch = input.match(/(?:upc|upca)\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (upcMatch?.[1]) return upcMatch[1].trim();

  const productMatch = input.match(/product(?:\s+id)?\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (productMatch?.[1]) return productMatch[1].trim();

  return '';
};

const buildActionSuggestions = (input: string) => {
  const normalized = input.toLowerCase();
  const identifier = extractIdentifier(input);
  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;
  const suggestions: typeof actionSuggestions.value = [];

  if (
    /(remove|delete|clear|undo).*(scan|scan event)/.test(normalized) &&
    inventoryCountImportId
  ) {
    suggestions.push({
      id: `remove_scan_${Date.now()}`,
      type: 'remove_scan',
      identifier,
      label: identifier
        ? translate(`Remove latest scan for ${identifier}`)
        : translate('Remove latest scan (missing identifier)'),
      status: 'idle',
      message: identifier
        ? undefined
        : translate('Provide a SKU/UPCA/identifier to remove a scan.'),
    });
  }

  if (/(match).*(unmatched|product|scan|sku|identifier)/.test(normalized) && inventoryCountImportId) {
    suggestions.push({
      id: `match_unmatched_${Date.now()}`,
      type: 'match_unmatched',
      identifier,
      label: identifier
        ? translate(`Find match for ${identifier}`)
        : translate('Find match for unmatched item'),
      status: 'idle',
      message: identifier
        ? undefined
        : translate('Provide a SKU/UPCA/identifier to match.'),
    });
  }

  return suggestions;
};

const removeScanByIdentifier = async (suggestion: any, mode: 'one' | 'all') => {
  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;
  if (!inventoryCountImportId) {
    suggestion.status = 'error';
    suggestion.message = translate('Open a count session to remove scans.');
    return;
  }
  if (!suggestion.identifier) {
    suggestion.status = 'error';
    suggestion.message = translate('Provide a SKU/UPCA/identifier to remove a scan.');
    return;
  }

  suggestion.status = 'running';
  try {
    const normalized = suggestion.identifier.toLowerCase();
    const events = await db.scanEvents
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .toArray();
    const negatedIds = new Set(
      events
        .filter((event) => event.negatedScanEventId)
        .map((event) => event.negatedScanEventId)
    );

    const candidates = events.filter(
      (event) =>
        !negatedIds.has(event.id) &&
        (event.scannedValue || '').toLowerCase() === normalized
    );

    if (!candidates.length) {
      suggestion.status = 'error';
      suggestion.message = translate('No matching scan event found for this identifier.');
      return;
    }

    if (mode === 'one') {
      const target = candidates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      await useInventoryCountImport().recordScan({
        inventoryCountImportId,
        productIdentifier: target.scannedValue || suggestion.identifier,
        productId: target.productId,
        quantity: -1,
      });
      suggestion.status = 'done';
      suggestion.message = translate('Removed 1 quantity from scans.');
      showToast(translate('Removed 1 quantity.'));
      return;
    }

    for (const event of candidates) {
      await useInventoryCountImport().recordScan({
        inventoryCountImportId,
        productIdentifier: event.scannedValue || suggestion.identifier,
        productId: event.productId,
        negatedScanEventId: event.id,
        quantity: -Math.abs(event.quantity || 1),
      });
    }

    suggestion.status = 'done';
    suggestion.message = translate('All scan quantities removed.');
    showToast(translate('All scan quantities removed.'));
  } catch (error: any) {
    suggestion.status = 'error';
    suggestion.message = translate('Failed to remove scan.');
    showToast(error?.message || translate('Failed to remove scan.'));
  }
};

const findMatchCandidates = async (suggestion: any) => {
  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;
  if (!inventoryCountImportId) {
    suggestion.status = 'error';
    suggestion.message = translate('Open a count session to match products.');
    return;
  }
  if (!suggestion.identifier) {
    suggestion.status = 'error';
    suggestion.message = translate('Provide a SKU/UPCA/identifier to match.');
    return;
  }

  suggestion.status = 'running';
  try {
    const normalized = suggestion.identifier.toLowerCase();
    const unmatchedItem = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(
        (item) =>
          !item.productId &&
          (item.productIdentifier || '').toLowerCase() === normalized
      )
      .first();

    if (!unmatchedItem) {
      suggestion.status = 'error';
      suggestion.message = translate('No unmatched item found for this identifier.');
      return;
    }

    const queryPayload = useProductMaster().buildProductQuery({
      keyword: suggestion.identifier,
      viewSize: 10,
      filter: 'isVirtual:false,productTypeId:FINISHED_GOOD',
    });
    const resp = await useProductMaster().loadProducts(queryPayload);
    const docs = resp?.data?.response?.docs || [];

    if (!docs.length) {
      suggestion.status = 'error';
      suggestion.message = translate('No product found. Use manual search to match.');
      return;
    }

    suggestion.options = docs.map((doc: any) => ({
      productId: doc.productId,
      label: `${doc.productId}${doc.productName ? ` • ${doc.productName}` : ''}`,
    }));
    suggestion.unmatchedItem = unmatchedItem;
    suggestion.status = 'done';
    suggestion.message = translate('Select a product to match.');
  } catch (error: any) {
    suggestion.status = 'error';
    suggestion.message = translate('Failed to search for products.');
    showToast(error?.message || translate('Failed to search for products.'));
  }
};

const matchUnmatchedItem = async (suggestion: any, productId: string) => {
  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;
  if (!inventoryCountImportId) return;

  suggestion.status = 'running';
  try {
    const existingUndirected = await useInventoryCountImport().getInventoryCountImportByProductId(
      inventoryCountImportId,
      productId
    );

    const context = {
      maargUrl: useAuthStore().getBaseUrl,
      omsInstance: useAuthStore().getOMS,
      token: useAuthStore().token.value,
      omsUrl: useAuthStore().getOmsRedirectionUrl,
      userLoginId: useUserProfile().getUserProfile?.username,
      facilityId: useProductStore().getCurrentFacility?.facilityId,
      isRequested: existingUndirected ? existingUndirected.isRequested : 'Y',
    };

    const plainItem = JSON.parse(JSON.stringify(suggestion.unmatchedItem));
    const plainContext = JSON.parse(JSON.stringify(context));

    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      inventoryCountImportId,
      plainItem,
      productId,
      plainContext
    );

    if (result?.success) {
      suggestion.status = 'done';
      suggestion.message = translate('Product matched successfully.');
      showToast(translate('Product matched successfully.'));
    } else {
      suggestion.status = 'error';
      suggestion.message = translate('Failed to match product.');
      showToast(translate('Failed to match product.'));
    }
  } catch (error: any) {
    suggestion.status = 'error';
    suggestion.message = translate('Failed to match product.');
    showToast(error?.message || translate('Failed to match product.'));
  }
};

const runAction = async (suggestion: any, mode?: 'one' | 'all') => {
  if (suggestion.type === 'remove_scan') {
    if (!mode) return;
    await removeScanByIdentifier(suggestion, mode);
  } else if (suggestion.type === 'match_unmatched') {
    await findMatchCandidates(suggestion);
  }
};

const onPromptKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
};

const scrollToBottom = async () => {
  await nextTick();
  const contentEl = contentRef.value?.$el as HTMLIonContentElement | undefined;
  contentEl?.scrollToBottom(200);
};

const sendPrompt = async () => {
  if (!canSend.value) return;

  const input = prompt.value.trim();
  prompt.value = '';
  messages.value.push({ role: 'user', text: input });
  actionSuggestions.value = buildActionSuggestions(input);
  await scrollToBottom();

  isSending.value = true;
  try {
    const context = includeContext.value ? await buildAgentContext(route, input) : undefined;
    const response = await askInventoryAgent(input, context || undefined);
    messages.value.push({ role: 'assistant', text: formatResponse(response) });
    await scrollToBottom();
  } catch (error: any) {
    showToast(error?.message || translate('Failed to reach agent.'));
    messages.value.push({
      role: 'assistant',
      text: translate('Something went wrong contacting the agent.'),
    });
    await scrollToBottom();
  } finally {
    isSending.value = false;
  }
};
</script>

<style scoped>
.agent-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
}

.agent-fab-button {
  --border-radius: 999px;
  --box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
}

.agent-header {
  --background: var(--ion-color-step-50, #f5f6f7);
}

.agent-title {
  width: 100%;
}

.agent-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.agent-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.agent-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.agent-status--ready {
  color: var(--ion-color-success);
}

.agent-status--busy {
  color: var(--ion-color-warning);
}

.agent-content {
  --background: linear-gradient(180deg, rgba(248, 248, 250, 0.95), rgba(255, 255, 255, 0.98));
}

.agent-footer {
  background: var(--ion-color-step-50, #f5f6f7);
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.agent-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 4px 4px;
}

.agent-input ion-textarea {
  flex: 1;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  background: var(--ion-color-step-50, #ffffff);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.agent-input ion-button {
  height: 42px;
  width: 42px;
  --border-radius: 14px;
}

.agent-context-toggle {
  --background: transparent;
  margin-top: 2px;
}

.agent-thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 24px;
}

.agent-actions-panel {
  margin: 0 16px 24px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.agent-actions-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.6;
  margin-bottom: 8px;
}

.agent-action-card {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ion-color-step-50, #ffffff);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  margin-bottom: 10px;
}

.agent-action-card:last-child {
  margin-bottom: 0;
}

.agent-action-label {
  font-weight: 600;
  margin-bottom: 4px;
}

.agent-action-message {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.agent-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.agent-action-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.agent-message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.agent-message--user {
  align-self: flex-end;
  text-align: right;
}

.agent-message--assistant {
  align-self: flex-start;
}

.agent-meta {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.6;
  margin-bottom: 4px;
}

.agent-bubble {
  white-space: pre-wrap;
  font-size: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--ion-color-step-50, #ffffff);
  color: var(--ion-color-dark, #1f1f1f);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.agent-message--user .agent-bubble {
  background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.22), rgba(49, 70, 255, 0.12));
  color: var(--ion-color-primary-contrast, #111111);
}

.agent-bubble--thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  animation: agentPulse 1.2s ease-in-out infinite;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.thinking-label {
  font-size: 12px;
  opacity: 0.8;
}

@keyframes agentPulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
