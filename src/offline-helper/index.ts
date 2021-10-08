import { Plugins } from '@capacitor/core';
import emitter from '@/event-bus';

const { Network } = Plugins;

const register = async () => {
    let networkStatus = await Network.getStatus();

    Network.addListener('networkStatusChange', (status: any) => {
        networkStatus = status;
        if (status.connected) {
            emitter.emit('online');
        } else {
            emitter.emit('offline');
        }
    });
    return networkStatus;
}

const getNetworkStatus = async () => {
    const networkStatus = await Network.getStatus();
    return networkStatus;
}

const OfflineHelper = {
    register,
    getNetworkStatus
}

export default OfflineHelper;
