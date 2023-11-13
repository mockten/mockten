#!/bin/bash

curl -LO https://downloads.mysql.com/archives/get/p/3/file/mysql-connector-j-8.1.0.tar.gz
tar -xzvf mysql-connector-j-8.1.0.tar.gz

mkdir -p /opt/jdbc
mv mysql-connector-j-8.1.0/mysql-connector-java-8.1.0.jar /opt/jdbc/

rm -rf mysql-connector-j-8.1.0
rm mysql-connector-j-8.1.0.tar.gz

sed -i "s/REMOTE_DB_HOST/${REMOTE_DB_HOST}/g" /usr/share/logstash/pipeline/logstash.conf
sed -i "s/REMOTE_DB_VIEWER_PW/${REMOTE_DB_VIEWER_PW}/g" /usr/share/logstash/pipeline/logstash.conf


/usr/share/logstash/bin/logstash -f /usr/share/logstash/pipeline/logstash.conf