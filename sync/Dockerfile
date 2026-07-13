FROM mysql:8.4

RUN microdnf install -y curl jq && microdnf clean all

COPY *.sh /
RUN chmod +x /*.sh

ENTRYPOINT ["bash", "-c"]
CMD ["while true; do sleep 300; /sync_script.sh; done"]
