import React from 'react';
import Image from 'next/image';

interface MoneyShelterLogoProps {
  variant?: 'dark' | 'light' | 'colored';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export function MoneyShelterLogo({
  variant = 'dark',
  className = '',
  size = 'md',
  showTagline = true,
}: MoneyShelterLogoProps) {
  const isLight = variant === 'light';

  // Sizing definitions for high-definition rendering of the official logo
  const heightMap = {
    sm: 36,
    md: 46,
    lg: 56,
    xl: 72,
  };

  const pixelHeight = heightMap[size];
  // Aspect ratio is roughly 373 / 230 ~ 1.62
  const pixelWidth = Math.round(pixelHeight * 1.62);

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Official Money Shelter Logo Image */}
      <div className={`relative flex items-center justify-center transition-transform hover:scale-105 duration-200 ${
        isLight ? 'brightness-0 invert drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]' : ''
      }`}>
        <Image
          src="/money-shelter-logo.png"
          alt="Money Shelter Pvt. Ltd. — Where Money Meets Trust"
          width={pixelWidth}
          height={pixelHeight}
          priority
          className="object-contain h-auto w-auto max-h-12 sm:max-h-14"
        />
      </div>
    </div>
  );
}
