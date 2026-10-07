'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notificationActions';
import type { PartnerNotification } from '@/types/db';

interface NotificationBellProps {
  align?: 'auto' | 'left' | 'right';
}

export default function NotificationBell({ align = 'auto' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function loadNotifications() {
    try {
      const res = await getNotificationsAction();
      if (res.ok) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {}
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Polling every 15s for real-time alerts
    return () => clearInterval(interval);
  }, []);

  // Compute fixed position ensuring the popover never goes off-screen
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Popover width: max 384px, or window width minus 24px padding
    const width = Math.min(384, Math.max(280, viewportWidth - 24));

    let left: number;

    if (align === 'left') {
      // Anchoring from left (e.g., sidebar on left side)
      // Align with button's left edge, but ensure at least 12px from viewport left and right
      left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
    } else if (align === 'right') {
      // Anchoring from right (e.g., mobile header on top right)
      left = Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));
    } else {
      // Auto-detection based on screen quadrant
      if (rect.left < viewportWidth / 2) {
        left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
      } else {
        left = Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));
      }
    }

    // Top position: 8px under button, with safety margin from bottom
    const top = Math.min(rect.bottom + 8, viewportHeight - 220);
    const maxHeight = Math.min(460, Math.max(260, viewportHeight - top - 16));

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 9999,
    });
  }, [align]);

  // Update position on open, resize, or scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleResizeOrScroll() {
      updatePosition();
    }

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, { capture: true });
    };
  }, [isOpen, updatePosition]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handleMarkAllRead() {
    setLoading(true);
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setLoading(false);
  }

  async function handleNotificationClick(notif: PartnerNotification) {
    if (!notif.read) {
      await markNotificationReadAction(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);

    // Navigate to appropriate screen
    if (notif.applicationId && notif.applicationId !== 'partner-onboarding' && notif.applicationId !== 'general') {
      router.push(`/branch/requests/${notif.applicationId}`);
    } else if (notif.applicationId === 'partner-onboarding') {
      router.push('/admin/partner-requests');
    }
  }

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            loadNotifications();
            setTimeout(updatePosition, 10);
          }
        }}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown (Fixed Viewport Clamped) */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400">
                <svg
                  className="w-10 h-10 mx-auto text-slate-300 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Workflow touchpoints and updates will appear here in real-time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-slate-50 ${
                    !notif.read ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      !notif.read ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          !notif.read
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {notif.createdAt
                          ? new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/90 border-t border-slate-200/80 text-center shrink-0">
            <Link
              href="/branch/requests"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
            >
              View Cases Pipeline →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
