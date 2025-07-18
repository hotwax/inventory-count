import logger from "@/logger";

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
          const itemsMap = new Map();
          items.map((item: any) => {
            itemsMap.set(item.importItemSeqId, item)
          })
          objStore.add({
            lastUpdatedStamp: Date.now(),
            items: itemsMap
          }, key).onsuccess = res;
        } else {
          const itemsToUpdate = itemToUpdate.items
          items.map((i: any) => {
            itemsToUpdate.set(i.importItemSeqId, i)
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

        // Commented as we are not supporting pagination for now when fetching data from indexedDB
        // if(start || end) {
        //   const items = Object.values(idx.result.items).slice(start, end)

        //   if(!items.length) {
        //     return reject("Items not found")
        //   }
        //   return resolve({
        //     lastUpdatedStamp: idx.result.lastUpdatedStamp,
        //     items
        //   });
        // }

        return resolve({
          lastUpdatedStamp: idx.result.lastUpdatedStamp,
          items: idx.result.items.values().toArray()
        });
      }

      idx.onerror = () => {
        return reject(idx.error);
      }
    };
  });
}

function deleteRecord(table: any, key: any) {
  const open = indexedDB.open("cycleCounts", 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore("counts");
  }

  open.onsuccess = () => {
    const transaction = open.result.transaction(table, "readwrite");
    const data = transaction.objectStore(table);

    try {
      // Deleting specific record from indexedDB table
      data.delete(key);
    } catch(err){
      logger.error(err)
    }
  }
}

// Deletes all the object store from the indexeddb
function deleteDB() {
  const deleteDB = indexedDB.deleteDatabase("cycleCounts");

  deleteDB.onerror = () => {
    logger.error("Error deleting database.");
  };

  deleteDB.onsuccess = () => {
    logger.log("Database deleted successfully");
  };
}

export { deleteDB, deleteRecord, readTable, syncItem, syncCount }