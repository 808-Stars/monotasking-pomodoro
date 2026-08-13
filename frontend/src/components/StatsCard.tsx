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
      <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
        <Icon name={icon} size={32} className="mb-2 md:mb-0 md:order-2" />
        <div className="md:order-1">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1"
            style={{ fontFamily: 'var(--oto-font-body)', fontSize: '12px' }}>
            {title}
          </p>
          <p className={`text-2xl md:text-3xl font-bold mt-1 ${color}`}
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
      </div>
    </div>
  );
}
