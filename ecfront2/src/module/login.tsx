import axios from 'axios';

const TOKEN_URL = `/api/uam/token`;
const USER_INFO_URL = `/api/uam/userinfo`;

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
    }));

    const token = response.data.access_token;
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