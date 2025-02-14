# mockten
![snapshot workflow](https://github.com/mockten/mockten/actions/workflows/ci.yml/badge.svg)

mockten is a service that mimics an e-commerce site. It can be deployed quickly on public clouds such as GCP/AWS/Azure, and it allows for features such as purchasing, product search, and ranking. It is designed to be used within the free tier of public cloud services, making it a great tool for those who want to learn about the mechanisms behind an e-commerce site.

## Requirement
- Go version
```
go1.21.4
```
- Nodejs version
```
node: '20.9.0'
```

# Building Dev Infrastructure
Before proceeding, ensure you have the following tool installed on your system:

- [gotask](https://taskfile.dev/#/installation)

## Testing your code

To confirm that `gotask` is correctly installed, run the following command:

```sh
task -v
```

1. To update your containers, please execute the following commands:

    ```sh
    task setup
    ```
2. To build k8s in your local environment, please execute the following command:

    ```sh
    task build
    ```
3. To clean up, please execute the following command after you cancel your reac app with Ctrl + C:

    ```sh
    task destroy
    ```


