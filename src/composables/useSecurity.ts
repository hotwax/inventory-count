import { api } from '@common';

export function useSecurity() {
  const getSecurityGroupAndPermissions = async (payload: any) => {
    const {
      dataDocumentId,
      filterByDate,
      fieldsToSelect,
      distinct,
      pageSize,
      ...customParametersMap
    } = payload || {};

    return await api({
      url: `oms/dataDocumentView`,
      method: 'POST',
      data: {
        dataDocumentId: dataDocumentId || 'SecurityGroupAndPermission',
        filterByDate: filterByDate != null ? filterByDate : true,
        fieldsToSelect: fieldsToSelect || '',
        distinct: distinct != null ? distinct : '',
        pageIndex: 0,
        pageSize: pageSize || 100,
        customParametersMap
      }
    });
  }

  const createSecurityGroupPermission = async (payload: {
    groupId: string;
    permissionId: string;
    fromDate: number;
  }) => {
    return await api({
      url: `admin/permissions/${payload.permissionId}`,
      method: "POST",
      data: payload,
    });
  }

  const updateSecurityGroupPermission = async (payload: {
    groupId: string;
    permissionId: string;
    fromDate?: number;
    thruDate: number;
  }) => {
    return await api({
      url: `admin/permissions/${payload.permissionId}`,
      method: "PUT",
      data: payload,
    });
  }

  return {
    getSecurityGroupAndPermissions,
    createSecurityGroupPermission,
    updateSecurityGroupPermission
  }
}
