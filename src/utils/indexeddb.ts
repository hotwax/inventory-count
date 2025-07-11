function syncItem(items: any, table: any, key: any) {
  const open = indexedDB.open("cycleCounts", 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore("counts");
  }

  return new Promise(res => {
    open.onsuccess = () => {
      const db = open.result;
      const tran = db.transaction(table, "readwrite");
      const objStore = tran.objectStore(table);
      // @ts-ignore
      objStore.get(key).onsuccess = ({ target: { result: itemToUpdate } }) => {
        if (!itemToUpdate) {
          objStore.add({
            lastUpdatedStamp: Date.now(),
            items: items.reduce((item: any, itm: any) => {
              item[itm.importItemSeqId] = itm
              return item
            }, {})
          }, key).onsuccess = res;
        } else {
          const itemsToUpdate = itemToUpdate.items
          items.map((i: any) => {
            itemsToUpdate[i.importItemSeqId] = i
          })

          objStore.put({
            lastUpdatedStamp: Date.now(),
            items: itemsToUpdate
          }, key).onsuccess = res;
        }
      };
    };
  });
}

function syncCount(count: any, table: any, key: any) {
  const open = indexedDB.open("cycleCounts", 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore("counts");
    open.result.createObjectStore("countDetails");
  }

  return new Promise(res => {
    open.onsuccess = () => {
      const db = open.result;
      const tran = db.transaction(table, "readwrite");
      const objStore = tran.objectStore(table);
      // @ts-ignore
      objStore.get(key).onsuccess = ({ target: { result: data } }) => {
        if (!data) {
          objStore.add(JSON.parse(count), key).onsuccess = res;
        } else {
          objStore.put(data, key).onsuccess = res;
        }
      };
    };
  });
}

function readTable(table: any, key: any, start?: any, end?: any) {
  const open = indexedDB.open("cycleCounts", 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore("counts");
    open.result.createObjectStore("countDetails");
  }

  return new Promise((resolve, reject) => {
    open.onsuccess = () => {
      const db = open.result;
      const tran = db.transaction(table);
      const objStore = tran.objectStore(table);
      const idx = objStore.get(key);
      
      idx.onsuccess = () => {
        if(!idx.result || !idx.result.items) {
          return reject("Items not found")
        }

        if(start || end) {
          const items = Object.values(idx.result.items).slice(start, end)

          if(!items.length) {
            return reject("Items not found")
          }
          return resolve({ 
            lastUpdatedStamp: idx.result.lastUpdatedStamp,
            items
          });
        }

        return resolve({
          lastUpdatedStamp: idx.result.lastUpdatedStamp,
          items: Object.values(idx.result.items)
        });
      }

      idx.onerror = () => {
        return reject(idx.error);
      }
    };
  });
}

export { readTable, syncItem, syncCount }