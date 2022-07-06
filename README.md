[![NPM Version](http://img.shields.io/npm/v/simple-odata-server-lowdb.svg?style=flat-square)](https://npmjs.com/package/simple-odata-server-lowdb)
[![License](http://img.shields.io/npm/l/simple-odata-server-lowdb.svg?style=flat-square)](http://opensource.org/licenses/MIT)
![example workflow](https://github.com/ranawaysuccessfully/node-simple-odata-server-lowdb/actions/workflows/npm-publish.yml/badge.svg)

**Adapter for [node.js simple odata server](https://github.com/pofider/node-simple-odata-server) using [lowdb](https://github.com/typicode/lowdb).**

It can be used as follows:
```js
import { createServer } from "http";
import { Low, Memory } from "lowdb";
import Adapter from "simple-odata-server-lowdb";
import ODataServer from "simple-odata-server";

const model = {
    namespace: "jsreport",
    entityTypes: {
        "UserType": {
            "_id": {"type": "Edm.String", key: true},
            "test": {"type": "Edm.String"},            
        }
    },   
    entitySets: {
        "users": {
            entityType: "jsreport.UserType"
        }
    }
};

const memoryDB = new Memory();
const db = new Low(memoryDB);
if (!db.data) {
  db.data = {};
  db.write();
}

const odataServer = ODataServer("http://localhost:1777");
odataServer
  .model(model)
  .adapter(Adapter(function (coll, cb) {
    if (!db.data[coll]) {
      db.data[coll] = [];
    }

    cb(null, db.data[coll]);
    db.write();
  }));
  
createServer(odataServer.handle.bind(odataServer)).listen(1777);
```
