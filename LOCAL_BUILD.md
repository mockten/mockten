# Run colima on local laptop
```
$ colima start
```

# Run uam(keycloak) component

### First time
```
$ cd uam
$ docker build -t mockten-auth .
$ docker run -dit -p 8080:8080 mockten-auth
```

### if you remains container
```
$ cd uam
$ docker ps -a
-- check `mockten-auth` container id
$ docker start ${mockten-auth container id}
```

- You can access `http://localhost:8080/` and use admin/admin via your browser.
- Add user using keycloak UI.



# Run frontend
```
$ cd ecfront2
$ npm run dev
> mockten@0.0.0 dev
> vite


  VITE v5.4.9  ready in 277 ms

  ➜  Local:   http://localhost:5173/
```

- You can access `http://localhost:5173/` and use userid/password which you registerd via keycloak UI.



