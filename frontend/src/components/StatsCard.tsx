import Icon from './Icons';
import type { IconName } from './Icons';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: IconName;
  color: string;
  subtitle?: string;
  className?: string;
}

export default function StatsCard({ title, value, icon, color, subtitle, className }: StatsCardProps) {
  return (
    <div className={`oto-window p-5 oto-card-lift ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1"
            style={{ fontFamily: 'var(--oto-font-body)', fontSize: '12px' }}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-1 ${color}`}
            style={{ fontFamily: 'var(--oto-font-body)', letterSpacing: '0.05em' }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1"
              style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px' }}>
              {subtitle}
            </p>
          )}
        </div>
        <Icon name={icon} size={36} />
      </div>
    </div>
  );
}
