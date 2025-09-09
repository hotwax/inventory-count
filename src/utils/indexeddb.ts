import logger from "@/logger";

const recordKey = "importItemSeqId"

function syncItem(values: any, table: any, key: any, database: string) {
  console.log("\n\nSyncing items to indexedDB", { values, table, key, database }, "\n\n");
  const open = indexedDB.open(database, 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore(table);
  }

  return new Promise(res => {
    open.onsuccess = () => {
      const db = open.result;
      const tran = db.transaction(table, "readwrite");
      const objStore = tran.objectStore(table);
      // @ts-ignore
      objStore.get(key).onsuccess = ({ target: { result } }) => {
        // Always overwrites the object store entry with the latest values mapped by key and a timestamp
        const data = new Map();
        values.map((value: any) => {
          data.set(value[recordKey], value)
        })
        objStore.put({
          lastUpdatedStamp: Date.now(),
          data
        }, key).onsuccess = res;
      };
    };
  });
}

function readTable(table: any, key: any, database: string) {
  console.log("\n\nReading items from indexedDB", { table, key, database }, "\n\n");
  const open = indexedDB.open(database, 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore(table);
  }

  return new Promise((resolve, reject) => {
    open.onsuccess = () => {
      const db = open.result;
      const tran = db.transaction(table);
      const objStore = tran.objectStore(table);
      const idx = objStore.get(key);
      
      idx.onsuccess = () => {
        if(!idx.result || !idx.result.data) {
          return reject("Data not found")
        }

        return resolve({
          lastUpdatedStamp: idx.result.lastUpdatedStamp,
          data: idx.result.data.values().toArray()
        });
      }

      idx.onerror = () => {
        return reject(idx.error);
      }
    };
  });
}

function deleteRecord(table: any, key: any, database: string) {
  const open = indexedDB.open(database, 1);

  // Creating object store, as it can only be created inside onupgradeneeded event
  open.onupgradeneeded = () => {
    open.result.createObjectStore(table);
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
function deleteDB(database: string) {
  const deleteDB = indexedDB.deleteDatabase(database);

  deleteDB.onerror = () => {
    logger.error("Error deleting database.");
  };

  deleteDB.onsuccess = () => {
    logger.log("Database deleted successfully");
  };
}

export { deleteDB, deleteRecord, readTable, syncItem }