import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeModal from './WelcomeModal';

const STORAGE_KEY = 'pomodoro_tutorial_done';

export default function Tutorial() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const startOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
    navigate('/onboarding');
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return <WelcomeModal onClose={skip} onStart={startOnboarding} />;
}