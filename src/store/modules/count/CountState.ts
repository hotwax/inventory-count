export default interface CountState {
  list: Array<any>,
  total: number,
  query: {
    facilityIds: Array<string>,
    noFacility: boolean
  },
  stats: any;
  cycleCounts: any;
  cycleCountItems: any;
  cycleCountImportSystemMessages: Array<any>
}