#!/bin/bash

mongod

mongosh <<EOF
use admin

db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }]
})

use product_info

db.createUser({
  user: 'user',
  pwd: 'password',
  roles: [{ role: 'readWrite', db: 'product_info' }]
})
EOF

mongod --shutdown
mongod