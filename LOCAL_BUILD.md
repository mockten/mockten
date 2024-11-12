# Run uam(keycloak) component
```
$ cd uam
$ docker build -t mockten-auth .
$ docker run -dit -p 8080:8080 mockten-auth
```