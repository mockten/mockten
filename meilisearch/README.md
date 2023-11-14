# meilisearch
https://www.meilisearch.com/docs/learn/cookbooks/docker

This is mirror image. <br>
You get a network error when you getmeili/meilisearch:v1.4 directly from GCP.
```
  Warning  Failed   46m (x13 over 4h51m)     kubelet  Failed to pull image "getmeili/meilisearch:v1.4": rpc error: code = DeadlineExceeded desc = failed to pull and unpack image "docker.io/getmeili/meilisearch:v1.4": failed to resolve reference "docker.io/getmeili/meilisearch:v1.4": failed to do request: Head "https://registry-1.docker.io/v2/getmeili/meilisearch/manifests/v1.4": dial tcp xx.xx.xx.xx:443: i/o timeout

```

