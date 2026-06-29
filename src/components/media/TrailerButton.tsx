'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import TrailerModal from './TrailerModal';

interface TrailerButtonProps {
  youtubeId: string;
}

export default function TrailerButton({ youtubeId }: TrailerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsOpen(true)}
        leftIcon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.324-5.886a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
          </svg>
        }
      >
        Watch Trailer
      </Button>
      
      <TrailerModal
        youtubeId={youtubeId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
