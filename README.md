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

## Google Authentication Setup
To use Goole SignUp/SignIn, please create Google auth client like below.
<img width="1594" height="1292" alt="CleanShot 2025-07-22 at 13 16 15@2x" src="https://github.com/user-attachments/assets/0769cb4f-53b3-4558-be68-53ddffb899ce" />
| Setting                   | Value                                                |
|---------------------------|------------------------------------------------------|
| Application type          | Web application                                    |
| Authorized Redirect URIs | http://localhost/api/uam/broker/google/endpoint     |

Once you get Client ID/secret, please replace the value in uam/config.json
<img width="1186" height="266" alt="CleanShot 2025-07-22 at 13 21 03@2x" src="https://github.com/user-attachments/assets/a7b12227-23ff-4807-9256-62e660a1a36f" />

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
3. You can do any tests with http://localhost:
   
    ![CleanShot 2025-02-14 at 13 23 37@2x](https://github.com/user-attachments/assets/32157356-2d52-4583-90f8-0469ad32765e)

3. To clean up, please execute the following command after you cancel your reac app with Ctrl + C:

    ```sh
    task destroy
    ```


