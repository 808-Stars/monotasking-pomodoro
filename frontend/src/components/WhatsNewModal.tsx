import Icon from './Icons';
import { CHANGELOG, type ChangelogEntry } from '../data/changelog';

interface WhatsNewModalProps {
  onClose: () => void;
  entry?: ChangelogEntry;  // 可指定条目，默认展示最新版本
}

export default function WhatsNewModal({ onClose, entry }: WhatsNewModalProps) {
  const target = entry ?? CHANGELOG[0];
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={onClose}>
      <div className="oto-modal max-w-lg w-[92vw] mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
        {/* 顶部装饰区 */}
        <div className="px-8 pt-6 pb-4 text-center flex-shrink-0" style={{ background: 'linear-gradient(180deg, #faf0e8 0%, #f4e0d4 100%)' }}>
          <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '22px', color: 'var(--oto-text)', margin: '4px 0 0', lineHeight: '1.6' }}>
            {target.title}
          </h2>
          <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '13px', color: 'var(--oto-text-muted)', marginTop: '4px' }}>
            v{target.version} · {target.date}
          </p>
        </div>

        {/* 高亮列表 */}
        <div className="px-6 py-4 overflow-y-auto" style={{ background: 'var(--oto-bg-card)' }}>
          <ol style={{ fontFamily: 'var(--oto-font-body)', fontSize: '15px', color: 'var(--oto-text-dim)', lineHeight: '1.6', paddingLeft: '1.5em', margin: 0, listStyleType: 'decimal' }}>
            {target.highlights.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5em' }}>
                {item.text}
                {item.subItems && item.subItems.length > 0 && (
                  <ul style={{ paddingLeft: '1.5em', marginTop: '0.25em', marginBottom: 0, listStyleType: 'disc' }}>
                    {item.subItems.map((sub, j) => (
                      <li key={j} style={{ marginBottom: '0.25em' }}>{sub}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-4 pt-2 flex-shrink-0" style={{ background: 'var(--oto-bg-card)', borderTop: '1px solid var(--oto-border-light)' }}>
          <button onClick={onClose} className="oto-btn w-full" style={{ padding: '12px 24px', fontSize: '16px' }}>
            <Icon name="check" size={16} /> 知道了
          </button>
        </div>
      </div>
    </div>
  );
}
