#!/bin/sh

# env check
if [ -z $GCS_BUCKET_NAME ]; then
    echo "Empty GCS_BUCKET_NAME..." >&2
    exit 1
fi

# mount gcs
gcsfuse -o allow_other -o nonempty $GCS_BUCKET_NAME /mnt/gcs/$GCS_BUCKET_NAME

# create symlink
ln -sfn /mnt/gcs/$GCS_BUCKET_NAME /apl/assets/img/

#Run APL
/apl/ecfront
