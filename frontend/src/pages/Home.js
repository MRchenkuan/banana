import React, { useState } from 'react';
import HomeNavbar from '../components/home/HomeNavbar';
import HeroSection from '../components/home/HeroSection';
import ImageGallery from '../components/home/ImageGallery';
import Footer from '../components/home/Footer';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

const Home = () => {
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };

  const showLoginModal = () => {
    setLoginModalVisible(true);
  };

  const showRegisterModal = () => {
    setRegisterModalVisible(true);
  };

  const handleLoginCancel = () => {
    setLoginModalVisible(false);
  };

  const handleRegisterCancel = () => {
    setRegisterModalVisible(false);
  };

  const switchToRegister = () => {
    setLoginModalVisible(false);
    setRegisterModalVisible(true);
  };

  const switchToLogin = () => {
    setRegisterModalVisible(false);
    setLoginModalVisible(true);
  };

  return (
    <div style={containerStyle}>
      <HomeNavbar 
        onLoginClick={showLoginModal}
        onRegisterClick={showRegisterModal}
        sdkLoading={sdkLoading}
      />
      
      <HeroSection onLoginClick={showLoginModal} />
      
      <ImageGallery />
      
      <Footer />
      
      <LoginModal
        visible={loginModalVisible}
        onClose={handleLoginCancel}
        onSwitchToRegister={switchToRegister}
      />
      
      <RegisterModal
        visible={registerModalVisible}
        onClose={handleRegisterCancel}
        onSwitchToLogin={switchToLogin}
      />
    </div>
  );
};

export default Home;