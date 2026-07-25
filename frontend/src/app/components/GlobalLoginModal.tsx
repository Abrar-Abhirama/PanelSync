'use client';

import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

export default function GlobalLoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useAuth();

  return (
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={closeLoginModal} 
    />
  );
}
