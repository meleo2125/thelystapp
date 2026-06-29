'use client';

import React, { useState, useEffect } from 'react';

import Image, { ImageProps } from 'next/image';

interface MediaImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
}

const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt,
  fallbackSrc = '/poster-fallback.svg',
  className = '',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(fallbackSrc);

  useEffect(() => {
    if (src) {
      setImgSrc(src);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
      className={`object-cover ${className}`}
      {...props}
    />
  );
};

export default MediaImage;
