import { useEffect } from 'react';

import useAuth from '@/auth/useAuth'

function OneTimeCheck() {
  const { updateUser } = useAuth();

  useEffect(() => {
    updateUser();
  }, []);

  return null;
}

export default OneTimeCheck