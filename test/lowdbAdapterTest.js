/* eslint-env mocha */
'use strict'
import { Low, Memory } from 'lowdb'
import ODataServer from 'simple-odata-server'
import model from './model.js'
import should from 'should/as-function.js'
import { nanoid } from 'nanoid'
import { createServer } from 'http'
import request from 'supertest'
import Adapter from '../index.js'
import { Query } from 'mingo'
import 'mingo/init/system.js'

describe('lowDBAdapter', function () {
  let odataServer
  let db
  let memoryAdapter
  beforeEach(function () {
    memoryAdapter = new Memory()
    db = new Low(memoryAdapter)
    db.data = []
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).adapter(Adapter(function (coll, cb) {
      cb(null, db.data)
      db.write()
    }))

    db.insert = (data, callback) => {
      data._id = nanoid()
      db.data.push(data)
      callback()
    }
  })

  it('insert should add _id', function (done) {
    odataServer.cfg.insert('users', { foo: 'Hello' }, {}, function (err, doc) {
      if (err) {
        return done(err)
      }

      should(doc).have.property('_id')
      done()
    })
  })

  it('remove should remove', function (done) {
    db.insert({ foo: 'Hello' }, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.remove('users', {}, {}, function (err) {
        if (err) {
          return done(err)
        }

        const queryInstance = new Query({})
        const cursor = queryInstance.find(db.data)
        const val = cursor.count()

        should(val).be.eql(0)
        done()
      })
    })
  })

  it('update should update', function (done) {
    db.insert({ foo: 'Hello' }, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.update('users', { foo: 'Hello' }, { $set: { foo: 'updated' } }, {}, function (err) {
        if (err) {
          return done(err)
        }

        const queryInstance = new Query({})
        const cursor = queryInstance.find(db.data)
        const val = cursor.all()

        should(val[0].foo).be.eql('updated')
        done()
      })
    })
  })

  it('query should be able to filter in', function (done) {
    db.insert({ foo: 'Hello' }, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', { $filter: { foo: 'Hello' } }, {}, function (err, res) {
        if (err) {
          return done(err)
        }

        should(res).have.length(1)
        done()
      })
    })
  })

  it('query should be able to filter out', function (done) {
    db.insert({ foo: 'Hello' }, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', { $filter: { foo: 'different' } }, {}, function (err, res) {
        if (err) {
          return done(err)
        }

        should(res).have.length(0)
        done()
      })
    })
  })

  it('query should do projections', function (done) {
    db.insert({ foo: 'Hello', x: 'x' }, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', { $select: { foo: 1, _id: 1 } }, {}, function (err, res) {
        if (err) {
          return done(err)
        }

        should(res[0]).have.property('_id')
        should(res[0]).have.property('foo')
        should(res[0]).not.have.property('x')
        done()
      })
    })
  })

  it('handle inconsistency on nedb with node 4 where object is returned instead of buffer', function (done) {
    const server = createServer(function (req, res) {
      odataServer.handle(req, res)
    })

    db.insert({ image: Buffer.from([1, 2, 3]) }, function (err, doc) {
      if (err) {
        return done(err)
      }

      request(server)
        .get('/users')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .expect(function (res) {
          should(res.body).be.ok()
          should(res.body.value[0].image).be.instanceOf(String)
          should(res.body.value[0].image).be.eql(Buffer.from([1, 2, 3]).toString('base64'))
        })
        .end(function (err, res) {
          done(err)
        })
    })
  })
})
