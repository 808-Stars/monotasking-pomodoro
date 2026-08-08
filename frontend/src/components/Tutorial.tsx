import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icons';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay">
      <div className="oto-modal p-8 max-w-md mx-4 text-center">
        <div className="mb-4" ><Icon name="clock" size={64} /></div>

        <h2 className="font-bold text-green-400 mb-1"
          style={{ fontFamily: 'var(--oto-font-body)', fontSize: '13px', lineHeight: '2' }}>
          欢迎使用
        </h2>
        <h3 className="font-bold text-gray-300 mb-4"
          style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.8' }}>
          monopomo
        </h3>
        <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--oto-font-body)', fontSize: '17px' }}>
          ▸ 16-BIT 个人效率管理工具
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 text-center oto-window" style={{ borderColor: 'var(--oto-gold)' }}>
            <Icon name="target" size={36} />
            <p className="font-bold text-blue-400"
              style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.6' }}>
              单核工作法
            </p>
            <p className="text-xs text-blue-500/60 mt-1" style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px' }}>
              定方向
            </p>
          </div>
          <div className="p-4 text-center oto-window" style={{ borderColor: 'var(--oto-gold)' }}>
            <Icon name="tomato" size={36} />
            <p className="font-bold text-red-400"
              style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.6' }}>
              番茄工作法
            </p>
            <p className="text-xs text-red-500/60 mt-1" style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px' }}>
              保执行
            </p>
          </div>
        </div>

        <p className="text-gray-400 leading-relaxed mb-6"
          style={{ fontFamily: 'var(--oto-font-body)', fontSize: '17px' }}>
          准备了一个 <strong className="text-purple-400">8步新手教程</strong>，
          带你亲手体验全部功能，约需 <strong className="text-yellow-400">3-5 分钟</strong>。
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={startOnboarding}
            className="oto-btn"
            style={{ background: '#e8e0d4' }}
          >
            <Icon name="play" size={14} /> 开始新手教程
          </button>
          <button
            onClick={skip}
            className="oto-btn"
            style={{ background: '#e8e0d4' }}
          >
            跳过，直接使用
          </button>
        </div>
      </div>
    </div>
  );
}
