import axios from 'axios';
import { setTokens } from './apiClient';

const TOKEN_URL = `/api/uam/token`;
const USER_INFO_URL = `/api/uam/userinfo`;

interface LoginResponse {
  token: string;
  refreshToken: string; // Added field
  userInfo: any;
}

export const login = async (userID: string, password: string): Promise<LoginResponse> => {
  console.log('Login API called for:', userID);

  try {
    const response = await axios.post(TOKEN_URL, new URLSearchParams({
      username: userID,
      password: password,
    }));

    // Handle both snake_case (standard) and camelCase (potential variation)
    const accessToken = response.data.access_token || response.data.accessToken;
    const refreshToken = response.data.refresh_token || response.data.refreshToken;

    // Save tokens here as a backup
    setTokens(accessToken, refreshToken);

    const userInfoResponse = await axios.get(USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Return both tokens so the caller (Login Page) can pass them to AuthContext
    return { 
      token: accessToken, 
      refreshToken: refreshToken, 
      userInfo: userInfoResponse.data 
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Login API failed:', error.response?.data);
      throw new Error(error.response?.data?.error_description || 'Login failed');
    } else {
      console.error('Login API failed:', error);
      throw new Error('Login failed');
    }
  }
};