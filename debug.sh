#!/bin/bash

# Keycloak の設定
REALM="mockten-realm-dev"

# 認証情報
CLIENT_ID="admin-cli"
USERNAME="superadmin"
PASSWORD="superadmin"

# デバッグ対象のユーザー情報
DEBUG_USERNAME="test_debug"
DEBUG_GROUP="Customer"
DEBUG_EMAIL="test$RANDOM@mail.com"
DEBUG_PASSWORD="password"
DEBUG_ROLE="customer"

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

echo "(4) Fetching created user by email: ${DEBUG_EMAIL}..."
USER_ID=$(curl -s -X GET \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:8082/api/uam/users | jq -r --arg email "${DEBUG_EMAIL}" '.[] | select(.email==$email) | .id')

if [[ -z "$USER_ID" || "$USER_ID" == "null" ]]; then
  echo "User with email ${DEBUG_EMAIL} not found."
  exit 1
fi
echo "(5) User ID: ${USER_ID}"

echo "(8) Fetching role ID for '${DEBUG_ROLE}'..."
ROLE_ID=$(curl -s -X GET \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:8082/api/uam/roles/${DEBUG_ROLE}" | jq -r '.id')

if [[ -z "$ROLE_ID" || "$ROLE_ID" == "null" ]]; then
  echo "Failed to fetch role ID for '${DEBUG_ROLE}'."
  exit 1
fi
echo "(9) Retrieved role ID: ${ROLE_ID}"


echo "(10.1) Assigning role '${DEBUG_ROLE}' to the user..."

ASSIGN_ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[{\"id\": \"${ROLE_ID}\", \"name\": \"${DEBUG_ROLE}\"}]" \
  "http://localhost:8082/api/uam/users/${USER_ID}/role-mappings/realm")

RESPONSE_BODY=$(echo "$ASSIGN_ROLE_RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$ASSIGN_ROLE_RESPONSE" | tail -n 1)
echo "STATUS CODE:$HTTP_STATUS"

echo "complete"
