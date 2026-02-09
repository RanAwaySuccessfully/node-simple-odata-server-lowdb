'use strict'
import { nanoid } from 'nanoid'
import { Query, Aggregator } from 'mingo'

function update (getDB, collection, query, update, req, cb) {
  getDB(collection, (err, data) => {
    if (err) {
      cb(err)
      return
    }

    const aggregator = new Aggregator([update])

    const queryInstance = new Query(query)
    const cursor = queryInstance.find(data)
    const ids = cursor.map(doc => doc._id)
    const results = ids.map(id => {
      const index = data.findIndex(doc => doc._id === id)
      const obj = aggregator.run([data[index]])
      data.splice(index, 1, obj[0])
      return obj
    })

    cb(null, results.length)
    return true
  })
}

function remove (getDB, collection, query, req, cb) {
  getDB(collection, (err, data) => {
    if (err) {
      cb(err)
      return
    }

    const queryInstance = new Query(query)
    const cursor = queryInstance.find(data)
    const ids = cursor.map(doc => doc._id)
    ids.forEach(id => {
      const index = data.findIndex(doc => doc._id === id)
      data.splice(index, 1)
    })

    cb(null)
    return true
  })
}

function insert (getDB, collection, doc, req, cb) {
  getDB(collection, (err, data) => {
    if (err) {
      cb(err)
      return
    }

    const existing = data.find(d => d._id === doc._id)
    if (existing) {
      cb(new Error('Document with this ID already exists.'))
      return
    }

    if (!doc._id) {
      doc._id = nanoid()
    }

    data.unshift(doc)
    cb(null, doc)
    return true
  })
}

function query (getDB, collection, query, req, cb) {
  getDB(collection, (err, data) => {
    if (err) {
      cb(err)
      return
    }

    if (!query.$filter) {
      query.$filter = {}
    }

    const queryInstance = new Query(query.$filter)
    let cursor = queryInstance.find(data, query.$select)

    if (query.$sort) {
      cursor = cursor.sort(query.$sort)
    }

    if (query.$skip) {
      cursor = cursor.skip(query.$skip)
    }

    if (query.$limit) {
      cursor = cursor.limit(query.$limit)
    }

    if (query.$count) {
      const count = cursor.count()
      cb(null, count)
    } else if (query.$inlinecount) {
      const value = cursor.all()
      const count = value.length
      cb(null, { value, count })
    } else {
      const value = cursor.all()
      cb(null, value)
    }
  })
}

export default function (getDB) {
  return oDataServer => oDataServer
    .update(update.bind(this, getDB))
    .remove(remove.bind(this, getDB))
    .query(query.bind(this, getDB))
    .insert(insert.bind(this, getDB)) ||
    oDataServer
}
