export default interface CountState {
  list: Array<any>,
  total: number,
  isScrollable: boolean,
  query: {
    facilityIds: Array<string>,
    noFacility: boolean,
    queryString: any
  },
  stats: any;
  cycleCounts: any;
  cycleCountItems: any;
  cycleCountImportSystemMessages: Array<any>
}