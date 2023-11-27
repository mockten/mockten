FROM mongo:7

ENV MONGO_INITDB_ROOT_USERNAME root
ENV MONGO_INITDB_ROOT_PASSWORD password
ENV TZ="Asia/Tokyo"
RUN echo $TZ > /etc/timezone

COPY init-mongo.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/init-mongo.sh

CMD ["/docker-entrypoint-initdb.d/init-mongo.sh"]