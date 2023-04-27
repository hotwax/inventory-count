export default interface UserState {
    token: string;
    current: any;
    currentFacility: object | null;
    permissions: any;
    instanceUrl: string;
}