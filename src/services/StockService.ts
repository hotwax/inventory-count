import { api } from '@/adapter';

const getInventoryAvailableByLocation = async (query: any): Promise<any> => {
    return api({
        url: "service/getInventoryAvailableByLocation",
        method: "post",
        data: query
    })
}

export const StockService = {
    getInventoryAvailableByLocation
}