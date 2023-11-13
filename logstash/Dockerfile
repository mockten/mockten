FROM docker.elastic.co/logstash/logstash:8.11.0
RUN rm -f /usr/share/logstash/pipeline/logstash.conf
COPY pipeline/ /usr/share/logstash/pipeline/
COPY run.sh /usr/share/logstash/run.sh
RUN /usr/share/logstash/bin/logstash-plugin install logstash-output-google_cloud_storage