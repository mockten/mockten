import React, { useEffect, useState } from 'react';

type UserDetail = {
    user_id: string;
    user_name: string;
    mail_address1: string;
    mail_address2: string;
    phone_num1: string;
    phone_num2: string;
    phone_num3: string;
    address1: string;
    address2: string;
    address3: string;
    post_code: string;
    pay_rank: number;
    sex: number;
    image_url: string;
    regist_day: string;
    birth_day: string;
};

interface ApiRequest {
  user_id: string;
}

interface UserDetailProps {
    user_id: string;
    user_name: string;
    mail_address1: string;
    mail_address2: string;
    phone_num1: string;
    phone_num2: string;
    phone_num3: string;
    address1: string;
    address2: string;
    address3: string;
    post_code: string;
    pay_rank: number;
    sex: number;
    image_url: string;
    regist_day: string;
    birth_day: string;
}

const UserDetail: React.FC<ApiRequest> = ({ user_id }) => {
    const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
    // const apiUrl = process.env.REACT_APP_SEARCH_API;
    const apiUrl = 'http://localhost:8080';

    useEffect(() => {
        const fetchData = async () => {
          try {
            const response = await fetch(`${apiUrl}/v1/user?u=${user_id}`, {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json'
              }
            });
            const user: UserDetailProps = await response.json();
            setUserDetails(user);
          } catch (error) {
            console.error('Error fetching recommended users:', error);
          }
        };
    
        fetchData();
      }, []);

    if (!userDetails) {
        return <div>Loading...</div>;
    }

    return (
        <div className="user-detail">
            <img src={userDetails.image_url} alt={`${userDetails.user_name}'s photo`} />
            <h1>{userDetails.user_name}</h1>
            <p>{userDetails.mail_address1}</p>
        </div>
    );
};

export default UserDetail;