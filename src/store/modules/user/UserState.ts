export default interface UserState {
    token: string;
    current: any;
    currentFacility: object | null;
    permissions: any;
    pwaState: any;
    instanceUrl: string;
    config: any;
    currentEComStore: any;
}