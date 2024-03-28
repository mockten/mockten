# How to create Dummy Data for Mongo

Add lines in init-mongo.js and execute 
```
docker build -t dummy-mongo .
```

# How to create Dump Data
- Run the container 
```
docker run --name dummy-mongo -d -p 27017:27017 dummy-mongo
```
- Create Dump in local and export outside the container
```
docker exec dummy-mongo mongodump --out /dump
docker cp dummy-mongo:/dump ./dump
```
# How to import Dump Data
- Create Dump in local and export outside the container
```
docker cp ./dump dummy-mongo:/dump
```
- Create Dump in local and export outside the container
```
docker exec dummy-mongo mongorestore --db product_info /dump/product_info
```