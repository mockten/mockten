#!/bin/bash

MOUNT_DISK="/mnt/disk"
if [ "$#" -gt 0 ]; then
    wget $1 -O go-portforio-apl-file.zip
    # this directory(/mnt/disk) depends on k8s job file
    # see: https://github.com/mockten/deployments
    if [ ! -d "$MOUNT_DISK" ]; then
        mkdir -p "$MOUNT_DISK"
        echo "Directory $MOUNT_DISK has been created."
    fi
    mv go-portforio-apl-file.zip "$MOUNT_DISK"
else
    echo "No parameter."
    sleep 300
    exit 1
fi