import axios from 'axios';

const KEYCLOAK_REALM = 'mockten-realm-dev';
const KEYCLOAK_BASE_URL = 'http://localhost:8080';
const TOKEN_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const USER_INFO_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;

interface LoginResponse {
  token: string;
  userInfo: any;
}

export const login = async (userID: string, password: string): Promise<LoginResponse> => {
  console.log(userID);
  console.log(password);

  try {
    const response = await axios.post(TOKEN_URL, new URLSearchParams({
      username: userID,
      password: password,
      client_id: 'mockten-react-client',
      client_secret: 'mockten-client-secret',
      grant_type: 'password',
      scope: "openid",
    }));

    const token = response.data.access_token;
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    const roles = decodedToken.roles || [];

    if (!roles.includes('customer')) {
      throw new Error('You are not authorized as a customer');
    }

    const userInfoResponse = await axios.get(USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { token, userInfo: userInfoResponse.data };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Login failed:', error.response?.data);
      throw new Error(error.response?.data?.error_description || 'Login failed');
    } else {
      console.error('Login failed:', error);
      throw new Error('Login failed');
    }
  }
};