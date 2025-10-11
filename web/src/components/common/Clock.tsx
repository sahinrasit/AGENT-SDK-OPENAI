import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

interface ClockProps {
  className?: string;
  showIcon?: boolean;
  showDate?: boolean;
  format24h?: boolean;
}

export const Clock: React.FC<ClockProps> = ({
  className = '',
  showIcon = true,
  showDate = false,
  format24h = true
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    if (format24h) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${period}`;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <ClockIcon className="w-4 h-4" />}
      <div className="flex flex-col">
        <span className="font-mono text-sm">{formatTime(time)}</span>
        {showDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(time)}
          </span>
        )}
      </div>
    </div>
  );
};
