import { jwtDecode } from "jwt-decode";

const key = "myket-ai-auth-token";

const storeToken = (token) => {
  if(typeof window == 'undefined') return;

  try {
    localStorage.setItem(key, token);
  } catch (error) {
    console.log(error);
  }
};

const getToken = () => {
  if(typeof window == 'undefined') return;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.log(error);
  }
};

const getUser = () => {
  if(typeof window == 'undefined') return;

  const token = getToken();
  return token ? jwtDecode(token) : null;
};

const removeToken = () => {
  if(typeof window == 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.log(error);
  }
};

// removeToken();

export default { getToken, getUser, removeToken, storeToken };
