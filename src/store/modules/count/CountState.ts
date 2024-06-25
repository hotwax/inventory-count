export default interface CountState {
  list: Array<any>,
  total: number,
  query: {
    facilityId: string,
    noFacility: boolean
  }
}