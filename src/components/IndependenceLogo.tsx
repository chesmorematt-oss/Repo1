import React from 'react';

interface IndependenceLogoProps {
  variant?: 'default' | 'card-on-dark';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<IndependenceLogoProps['size']>, string> = {
  xs: 'h-7',
  sm: 'h-9',
  md: 'h-12',
  lg: 'h-16 sm:h-20',
};

export const IndependenceLogo: React.FC<IndependenceLogoProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const img = (
    <img
      src="/independence-planning-zoning-logo.png"
      alt="City of Independence, Iowa — Planning & Zoning"
      className={`${SIZE_CLASSES[size]} w-auto object-contain select-none ${
        variant === 'default' ? className : ''
      }`}
    />
  );

  if (variant === 'card-on-dark') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-white px-3.5 py-2 shadow-md border border-slate-200/90 ${className}`}
      >
        {img}
      </div>
    );
  }

  return img;
};
