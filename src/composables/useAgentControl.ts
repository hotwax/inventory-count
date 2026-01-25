import { ref } from 'vue';
import api from '@/services/RemoteAPI';
import { hasError } from '@/stores/authStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserProfile } from '@/stores/userProfileStore';
import { db } from '@/services/appInitializer';

const isInitialized = ref(false);
const isInitializing = ref(false);
const deviceId = ref<string | null>(null);
const lastError = ref<Error | null>(null);
const lastInitTime = ref<number | null>(null);

/**
 * Agent Control Composable
 * 
 * Provides reactive state and methods for managing agent control instructions,
 * device registration, and instruction execution.
 * 
 * IMPORTANT: This runs on EVERY app open (new window/tab or after closing),
 * but NOT on page refresh within the same session.
 */

// Instruction type constants
const InstructionTypes = {
    CLEAR_IDX_DB: 'AGCI_CLEAR_IDX_DB',
    LOGOUT_USER: 'AGCI_LOGOUT_USER',
    CLEAR_CACHE: 'AGCI_CLEAR_CACHE',
    ADD_SOLR_FILTER: 'AGCI_ADD_SOLR_FILTER'
} as const;

/**
 * Get or create a device ID from the server
 */
async function getOrCreateDeviceId(facilityId: string): Promise<string | null> {
    try {
        // Get stored deviceId from IndexedDB appPreferences
        const pref = await db?.appPreferences.get("deviceId");
        const storedDeviceId = pref?.value;

        const payload: any = {
            facilityId,
            agentTypeEnumId: 'AGT_PWA'
        };

        if (storedDeviceId) {
            payload.deviceId = storedDeviceId;
        }

        const resp = await api({
            url: '/admin/device/id',
            method: 'POST',
            data: payload
        });

        if (resp && !hasError(resp)) {
            const deviceId = resp.data.deviceId;

            // Store deviceId in IndexedDB appPreferences
            await db?.appPreferences.put({ "key": "deviceId", "value": deviceId });
            return deviceId;
        } else {
            console.error('[AgentControl] Failed to get device ID:', resp?.data);
            return null;
        }
    } catch (error) {
        console.error('[AgentControl] Error getting device ID:', error);
        throw error;
    }
}

/**
 * Fetch active instructions from the server
 */
async function fetchInstructions(deviceId: string, facilityId: string): Promise<any[]> {
    try {
        const payload: any = {
            deviceId,
            facilityId,
            agentTypeEnumId: 'AGT_PWA',
            applicationId: 'INVENTORY_COUNT'
        };

        const resp = await api({
            url: '/admin/device/instructions',
            method: 'GET',
            params: payload
        });

        if (resp && !hasError(resp)) {
            const instructions = resp.data.instructions || [];
            console.log(`[AgentControl] Fetched ${instructions.length} instructions`);
            return instructions;
        } else {
            console.error('[AgentControl] Failed to fetch instructions:', resp?.data);
            return [];
        }
    } catch (error) {
        console.error('[AgentControl] Error fetching instructions:', error);
        return [];
    }
}

/**
 * Acknowledge an instruction execution
 */
async function acknowledgeInstruction(agentCtrlInstructionId: string, deviceId: string): Promise<boolean> {
    try {
        const payload: any = {
            agentCtrlInstructionId,
            deviceId
        };

        const resp = await api({
            url: '/admin/device/acknowledge',
            method: 'POST',
            data: payload
        });

        if (resp && !hasError(resp)) {
            console.log(`[AgentControl] Acknowledged instruction ${agentCtrlInstructionId}`);
            return resp.data.success;
        } else {
            console.error('[AgentControl] Failed to acknowledge instruction:', resp?.data);
            return false;
        }
    } catch (error) {
        console.error('[AgentControl] Error acknowledging instruction:', error);
        return false;
    }
}

/**
 * Clear IndexedDB except appPreferences table
 */
async function handleClearIndexedDB(): Promise<void> {
    try {
        
        await db.transaction("rw", db.inventoryCountRecords, db.productIdentification, db.products, db.productInventory, async () => {
            await Promise.all([
            db.inventoryCountRecords.clear(),
            db.productIdentification.clear(),
            db.products.clear(),
            db.productInventory.clear(),
            ]);
        });
        await db.transaction("rw", db.scanEvents, async () => {
            await db.scanEvents.clear();
        });
        console.log('[AgentControl] IndexedDB cleared');
    } catch (error) {
        console.error('[AgentControl] Error clearing IndexedDB:', error);
        throw error;
    }
}

/**
 * Clear local cache (localStorage and sessionStorage)
 */
async function handleClearCache(): Promise<void> {
    try {
        // Clear all storage (deviceId is in IndexedDB, safe)
        console.log('[AgentControl] Local cache cleared (deviceId preserved in IndexedDB)');
    } catch (error) {
        console.error('[AgentControl] Error clearing cache:', error);
        throw error;
    }
}

/**
 * Logout the current user
 */
async function handleLogoutUser(): Promise<void> {
    try {
        const authStore = useAuthStore();
        await authStore.logout();
        console.log('[AgentControl] User logged out');
    } catch (error) {
        console.error('[AgentControl] Error logging out user:', error);
        throw error;
    }
}

/**
 * Add Solr filter (placeholder for future implementation)
 */
async function handleAddSolrFilter(payloadJson?: string): Promise<void> {
    try {
        if (payloadJson) {
            const payload = JSON.parse(payloadJson);
            console.log('[AgentControl] Solr filter payload:', payload);
            // TODO: Implement Solr filter logic
        }
        console.log('[AgentControl] Add Solr filter - not yet implemented');
    } catch (error) {
        console.error('[AgentControl] Error adding Solr filter:', error);
        throw error;
    }
}

/**
 * Execute a single instruction
 */
async function executeInstruction(instruction: any, deviceId: string): Promise<boolean> {
    try {
        console.log(`[AgentControl] Executing instruction: ${instruction.instructionTypeEnumId}`);

        switch (instruction.instructionTypeEnumId) {
            case InstructionTypes.CLEAR_IDX_DB:
                await handleClearIndexedDB();
                break;

            case InstructionTypes.LOGOUT_USER:
                await handleLogoutUser();
                break;

            case InstructionTypes.CLEAR_CACHE:
                await handleClearCache();
                break;

            case InstructionTypes.ADD_SOLR_FILTER:
                await handleAddSolrFilter(instruction.payloadJson);
                break;

            default:
                console.warn(`[AgentControl] Unknown instruction type: ${instruction.instructionTypeEnumId}`);
                return false;
        }

        const acknowledged = await acknowledgeInstruction(instruction.agentCtrlInstructionId, deviceId);

        if (acknowledged) {
            console.log(`[AgentControl] Successfully executed and acknowledged: ${instruction.instructionTypeEnumId}`);
        } else {
            console.warn(`[AgentControl] Executed but failed to acknowledge: ${instruction.instructionTypeEnumId}`);
        }

        return true;
    } catch (error) {
        console.error(`[AgentControl] Error executing instruction ${instruction.instructionTypeEnumId}:`, error);
        return false;
    }
}

/**
 * Fetch and execute all pending instructions
 */
async function fetchAndExecuteInstructions(deviceId: string, facilityId: string): Promise<void> {
    try {
        const instructions = await fetchInstructions(deviceId, facilityId);

        if (instructions.length === 0) {
            console.log('[AgentControl] No pending instructions');
            return;
        }

        console.log(`[AgentControl] Executing ${instructions.length} instruction(s)...`);

        for (const instruction of instructions) {
            await executeInstruction(instruction, deviceId);
        }

        console.log('[AgentControl] Finished executing all instructions');
    } catch (error) {
        console.error('[AgentControl] Error in fetchAndExecuteInstructions:', error);
        throw error;
    }
}

/**
 * Initialize agent control system
 * This runs on EVERY app initialization (including app open/reload)
 */
async function initializeAgentControl(facilityId: string): Promise<void> {
    try {
        console.log('[AgentControl] Initializing agent control system...');

        // Always get/register device ID (creates ExecutionAgent record if needed)
        const deviceId = await getOrCreateDeviceId(facilityId);

        if (!deviceId) {
            console.error('[AgentControl] Failed to get device ID, aborting initialization');
            return;
        }

        // Always check for and execute pending instructions
        await fetchAndExecuteInstructions(deviceId, facilityId);

        console.log('[AgentControl] Agent control system initialized successfully');
    } catch (error) {
        console.error('[AgentControl] Error initializing agent control:', error);
        throw error;
    }
}

/**
 * Main composable export
 */
export function useAgentControl() {
    /**
     * Initialize the agent control system
     * Runs on EVERY app initialization
     */
    async function initialize(facilityId?: string): Promise<boolean> {
        if (isInitializing.value) {
            console.warn('[useAgentControl] Initialization already in progress');
            return false;
        }

        try {
            isInitializing.value = true;
            lastError.value = null;

            const targetFacilityId = facilityId || useUserProfile().getUserProfile?.facilityId;

            if (!targetFacilityId) {
                throw new Error('No facilityId available for agent initialization');
            }

            await initializeAgentControl(targetFacilityId);

            isInitialized.value = true;
            lastInitTime.value = Date.now();

            return true;
        } catch (error) {
            console.error('[useAgentControl] Initialization failed:', error);
            lastError.value = error as Error;
            isInitialized.value = false;
            return false;
        } finally {
            isInitializing.value = false;
        }
    }

    /**
     * Register or retrieve device ID
     */
    async function registerDevice(facilityId?: string): Promise<string | null> {
        try {
            lastError.value = null;

            const targetFacilityId = facilityId || useUserProfile().getUserProfile?.facilityId;

            if (!targetFacilityId) {
                throw new Error('No facilityId provided for device registration');
            }

            const id = await getOrCreateDeviceId(targetFacilityId);

            if (id) {
                deviceId.value = id;
            }

            return id;
        } catch (error) {
            console.error('[useAgentControl] Device registration failed:', error);
            lastError.value = error as Error;
            return null;
        }
    }

    /**
     * Manually fetch and execute pending instructions
     */
    async function fetchInstructionsManually(facilityId?: string): Promise<boolean> {
        try {
            lastError.value = null;

            const targetFacilityId = facilityId || useUserProfile().getUserProfile?.facilityId;

            if (!targetFacilityId) {
                throw new Error('No facilityId provided for fetching instructions');
            }

            let id = deviceId.value;
            if (!id) {
                id = await registerDevice(targetFacilityId);
                if (!id) {
                    throw new Error('Failed to get device ID');
                }
            }

            await fetchAndExecuteInstructions(id, targetFacilityId);
            return true;
        } catch (error) {
            console.error('[useAgentControl] Failed to fetch instructions:', error);
            lastError.value = error as Error;
            return false;
        }
    }

    /**
     * Reset the initialization state
     */
    function reset(): void {
        isInitialized.value = false;
        isInitializing.value = false;
        deviceId.value = null;
        lastError.value = null;
        lastInitTime.value = null;
    }

    /**
     * Get the current device ID from IndexedDB
     */
    async function getStoredDeviceId(): Promise<string | null> {
        try {
            const pref = await db?.appPreferences.get("deviceId");
            return pref?.value || null;
        } catch (error) {
            console.error('[useAgentControl] Error getting stored device ID:', error);
            return null;
        }
    }

    /**
     * Check if agent control is initialized
     */
    function checkInitialized(): boolean {
        return isInitialized.value;
    }

    /**
     * Get initialization status information
     */
    async function getStatus() {
        const storedDeviceId = await getStoredDeviceId();

        return {
            isInitialized: isInitialized.value,
            isInitializing: isInitializing.value,
            deviceId: deviceId.value || storedDeviceId,
            lastError: lastError.value,
            lastInitTime: lastInitTime.value
        };
    }

    return {
        // State
        isInitialized,
        isInitializing,
        deviceId,
        lastError,
        lastInitTime,

        // Methods
        initialize,
        registerDevice,
        fetchInstructions: fetchInstructionsManually,
        reset,
        getStoredDeviceId,
        checkInitialized,
        getStatus
    };
}
