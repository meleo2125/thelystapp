'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  targetUid: string;
  initialStatus: 'following' | 'requested' | 'none';
  initialFollowerCount: number;
}

export default function FollowButton({
  targetUid,
  initialStatus,
  initialFollowerCount,
}: FollowButtonProps) {
  const [status, setStatus] = useState<'following' | 'requested' | 'none'>(initialStatus);
  const [count, setCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    try {
      const isRemoving = status === 'following' || status === 'requested';
      const method = isRemoving ? 'DELETE' : 'POST';
      const url = isRemoving 
        ? `/api/social/follow?uid=${targetUid}` 
        : '/api/social/follow';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: isRemoving ? undefined : JSON.stringify({ uid: targetUid }),
      });

      if (res.ok) {
        const json = await res.json();
        
        if (isRemoving) {
          if (status === 'following') {
            setCount(prev => Math.max(0, prev - 1));
            toast.success('Unfollowed user');
          } else {
            toast.success('Follow request cancelled');
          }
          setStatus('none');
        } else {
          // POST response returns the new follow status: 'following' or 'requested'
          const newStatus = json.status || 'following';
          if (newStatus === 'following') {
            setCount(prev => prev + 1);
            toast.success('Following user!');
          } else {
            toast.success('Follow request sent!');
          }
          setStatus(newStatus);
        }
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to update follow status');
      }
    } catch (err) {
      toast.error('Network error updating follow status');
    } finally {
      setLoading(false);
    }
  };

  const getButtonLabel = () => {
    if (status === 'following') return 'Following';
    if (status === 'requested') return 'Requested';
    return 'Follow';
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-xs text-muted">
        <strong className="text-foreground text-sm font-bold mr-1">{count}</strong> Followers
      </div>
      <Button
        variant={status !== 'none' ? 'secondary' : 'primary'}
        size="sm"
        isLoading={loading}
        onClick={handleToggleFollow}
        className="cursor-pointer font-bold px-5"
      >
        {getButtonLabel()}
      </Button>
    </div>
  );
}
