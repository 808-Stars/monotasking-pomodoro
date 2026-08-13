import Icon from './Icons';

interface WelcomeModalProps {
  onClose: () => void;
  onStart?: () => void;
}

export default function WelcomeModal({ onClose, onStart }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={onClose}>
      <div className="oto-modal max-w-lg w-[92vw] mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 顶部装饰区 */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(180deg, #faf0e8 0%, #f4e0d4 100%)' }}>
          <div className="mb-5" style={{ color: 'var(--oto-gold-dark)' }}>
            <Icon name="clock" size={72} />
          </div>
          <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '14px', color: 'var(--oto-text)', letterSpacing: '2px', lineHeight: '2' }}>
            欢迎使用
          </p>
          <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '28px', color: 'var(--oto-text)', margin: '4px 0 0', lineHeight: '1.6' }}>
            MONOPOMO
          </h2>
        </div>

        {/* 双卡片 */}
        <div className="px-6 py-5" style={{ background: 'var(--oto-bg-card)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="oto-window-gold p-5 text-center">
              <div className="mb-3" style={{ color: 'var(--oto-blue)' }}>
                <Icon name="target" size={40} />
              </div>
              <p style={{ fontFamily: 'var(--oto-font-title)', fontSize: '15px', color: 'var(--oto-blue)', lineHeight: '1.6', fontWeight: 'bold' }}>
                单核工作法
              </p>
              <p style={{ fontFamily: "'HYPixel'", fontSize: '12px', color: 'var(--oto-blue)', opacity: 0.6, marginTop: '2px' }}>
                Monotasking
              </p>
              <p style={{ fontFamily: 'var(--oto-font-title)', fontSize: '20px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>
                定方向
              </p>
            </div>
            <div className="oto-window-gold p-5 text-center">
              <div className="mb-3" style={{ color: 'var(--oto-red)' }}>
                <Icon name="tomato" size={40} />
              </div>
              <p style={{ fontFamily: 'var(--oto-font-title)', fontSize: '15px', color: 'var(--oto-red)', lineHeight: '1.6', fontWeight: 'bold' }}>
                番茄工作法
              </p>
              <p style={{ fontFamily: "'HYPixel'", fontSize: '12px', color: 'var(--oto-red)', opacity: 0.6, marginTop: '2px' }}>
                Pomodoro
              </p>
              <p style={{ fontFamily: 'var(--oto-font-title)', fontSize: '20px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>
                保执行
              </p>
            </div>
          </div>
        </div>

        {/* 介绍文字 */}
        <div className="px-8 pb-5" style={{ background: 'var(--oto-bg-card)' }}>
          <div className="oto-inset p-4 text-center">
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '15px', color: 'var(--oto-text-dim)', lineHeight: '2' }}>
              {onStart ? '准备了一个 ' : '我们为您准备了一个 '}<strong style={{ color: 'var(--oto-blue)' }}>8 步新手教程</strong>
            </p>
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '14px', color: 'var(--oto-text-muted)', lineHeight: '2' }}>
              带你亲手体验全部功能，约需 <strong style={{ color: 'var(--oto-red)' }}>3-5 分钟</strong>
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 pb-6" style={{ background: 'var(--oto-bg-card)' }}>
          {onStart ? (
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={onStart} className="oto-btn" style={{ padding: '10px 20px', fontSize: '15px' }}>
                <Icon name="play" size={14} /> 开始新手教程
              </button>
              <button onClick={onClose} className="oto-btn oto-btn-gray" style={{ padding: '10px 20px', fontSize: '15px' }}>
                跳过，直接使用
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="oto-btn w-full" style={{ padding: '12px 24px', fontSize: '16px' }}>
              <Icon name="check" size={16} /> 知道了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}