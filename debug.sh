#!/bin/bash

# Keycloak の設定
REALM="mockten-realm-dev"

# 認証情報
CLIENT_ID="admin-cli"
USERNAME="superadmin"
PASSWORD="superadmin"

# デバッグ対象のユーザー情報
DEBUG_EMAIL="test_debug2@mail.com"
DEBUG_USERNAME="test_debug"
DEBUG_GROUP="Customer"
DEBUG_PASSWORD="password"
DEBUG_ROLE="customer"

# 1. Keycloak 管理者トークンを取得
echo "(1) Requesting Admin Access Token..."
ADMIN_TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "client_id=mockten-react-client&client_secret=mockten-client-secret&grant_type=password&scope=openid profile&username=superadmin&password=superadmin" \
  http://localhost:8082/api/uam/token | jq -r '.access_token')

if [[ -z "$ADMIN_TOKEN" || "$ADMIN_TOKEN" == "null" ]]; then
  echo "Failed to retrieve admin access token."
  exit 1
fi
echo "(1) Admin Access Token retrieved successfully."
echo "ADMIN_TOKEN=$ADMIN_TOKEN"

# 2. ユーザー作成APIを呼び出し
echo "(2) Creating user with email: ${DEBUG_EMAIL}..."
CREATE_USER_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${DEBUG_USERNAME}\",
    \"email\": \"${DEBUG_EMAIL}\",
    \"enabled\": true,
    \"emailVerified\": true,
    \"firstName\": \"Test\",
    \"lastName\": \"Debug\",
    \"credentials\": [{
      \"type\": \"password\",
      \"value\": \"${DEBUG_PASSWORD}\",
      \"temporary\": false
    }],
    \"groups\": [\"${DEBUG_GROUP}\"]
  }" \
  http://localhost:8082/api/uam/users)

if echo "$CREATE_USER_RESPONSE" | grep -q "error"; then
  echo "Failed to create user. Response: $CREATE_USER_RESPONSE"
  exit 1
fi
echo "(3) User created successfully."

# 3. ユーザーIDを取得
echo "(4) Fetching created user by email: ${DEBUG_EMAIL}..."
USER_ID=$(curl -s -X GET \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:8082/api/uam/users | jq -r --arg email "${DEBUG_EMAIL}" '.[] | select(.email==$email) | .id')

if [[ -z "$USER_ID" || "$USER_ID" == "null" ]]; then
  echo "User with email ${DEBUG_EMAIL} not found."
  exit 1
fi
echo "(5) User ID: ${USER_ID}"


# 5. ロールIDを取得
echo "(8) Fetching role ID for '${DEBUG_ROLE}'..."
ROLE_ID=$(curl -s -X GET \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:8082/api/uam/roles/${DEBUG_ROLE}" | jq -r '.id')

if [[ -z "$ROLE_ID" || "$ROLE_ID" == "null" ]]; then
  echo "Failed to fetch role ID for '${DEBUG_ROLE}'."
  exit 1
fi
echo "(9) Retrieved role ID: ${ROLE_ID}"


# 6.1 ユーザーにロールを割り当て
echo "(10.1) Assigning role '${DEBUG_ROLE}' to the user..."
#ASSIGN_ROLE_JSON=$(jq -n --arg user_id "$USER_ID" --arg role_id "$ROLE_ID" --arg role_name "$DEBUG_ROLE" '{
#  user_id: $user_id,
#  roles: [{
#    id: $role_id,
#    name: $role_name
#  }]
#}')
ASSIGN_ROLE_JSON=$(jq -n --arg user_id "$USER_ID" --arg role_id "$ROLE_ID" --arg role_name "$DEBUG_ROLE" '{
  user_id: $user_id,
  roles: [{ id: $role_id, name: $role_name }]
}')


echo "Sending JSON Payload: $ASSIGN_ROLE_JSON"
echo "$ASSIGN_ROLE_JSON" | jq .


ASSIGN_ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ASSIGN_ROLE_JSON" \
  "http://localhost:8082/api/uam/role-mapping")

RESPONSE_BODY=$(echo "$ASSIGN_ROLE_RESPONSE" | sed '$d') 
HTTP_STATUS=$(echo "$ASSIGN_ROLE_RESPONSE" | tail -n 1)   

if [[ "$HTTP_STATUS" -ne 204 || "$RESPONSE_BODY" == *"error"* ]]; then
  echo "Failed to assign role. HTTP Status: $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
fi
echo "HTTP Status: $HTTP_STATUS"
echo "complete"
