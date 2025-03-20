import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import './Auth.css';

const AuthScreen = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleLogin = (user) => {
    onAuthenticated(user);
  };

  const handleRegister = (user) => {
    onAuthenticated(user);
  };

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  return (
    <div className="auth-screen">
      {isLogin ? (
        <Login onLogin={handleLogin} switchToRegister={switchToRegister} />
      ) : (
        <Register onRegister={handleRegister} switchToLogin={switchToLogin} />
      )}
    </div>
  );
};

export default AuthScreen;