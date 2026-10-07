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
import {
  triggerNotificationAlert,
  testNotificationSound,
  getNotificationSoundMode,
  setNotificationSoundMode,
  seedSeenNotifications,
  markNotificationSeen,
  isNotificationSeen,
  unlockAudio,
  type SoundMode,
} from '@/lib/notificationAudio';

interface NotificationBellProps {
  align?: 'auto' | 'left' | 'right';
}

export default function NotificationBell({ align = 'auto' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [soundMode, setSoundMode] = useState<SoundMode>('voice');
  const [activeToast, setActiveToast] = useState<PartnerNotification | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Load sound mode on client mount
  useEffect(() => {
    setSoundMode(getNotificationSoundMode());
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsAction();
      if (res.ok) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);

        // On initial page load: record existing notifications so they don't trigger sound retroactively
        if (isFirstLoadRef.current) {
          seedSeenNotifications(res.notifications.map((n) => n.id));
          isFirstLoadRef.current = false;
        } else {
          // Detect brand new unread notifications that arrived while using the application
          const brandNew = res.notifications.filter(
            (n) => !isNotificationSeen(n.id) && !n.read
          );

          if (brandNew.length > 0) {
            // Mark as seen immediately so sound doesn't re-trigger on next poll
            brandNew.forEach((n) => markNotificationSeen(n.id));

            // Trigger WhatsApp-style chime + natural voice alert for the newest notification
            const latest = brandNew[0];
            triggerNotificationAlert(latest);

            // Show floating real-time in-app toast banner
            setActiveToast(latest);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 6500);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // Polling every 10s for fast real-time alerts
    return () => clearInterval(interval);
  }, [loadNotifications]);

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
    setActiveToast(null);

    // Navigate to appropriate screen
    if (notif.applicationId && notif.applicationId !== 'partner-onboarding' && notif.applicationId !== 'general') {
      router.push(`/branch/requests/${notif.applicationId}`);
    } else if (notif.applicationId === 'partner-onboarding') {
      router.push('/admin/partner-requests');
    }
  }

  // Toggle sound mode: voice -> chime -> mute -> voice
  function cycleSoundMode() {
    unlockAudio();
    let nextMode: SoundMode = 'voice';
    if (soundMode === 'voice') nextMode = 'chime';
    else if (soundMode === 'chime') nextMode = 'mute';
    else if (soundMode === 'mute') nextMode = 'voice';

    setSoundMode(nextMode);
    setNotificationSoundMode(nextMode);

    if (nextMode !== 'mute') {
      testNotificationSound();
    }
  }

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          unlockAudio();
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
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Mode Toggle */}
              <button
                type="button"
                onClick={cycleSoundMode}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 shadow-2xs active:scale-95"
                title={`Sound mode: ${soundMode}. Click to toggle.`}
              >
                <span>
                  {soundMode === 'voice' && '🔊 Voice'}
                  {soundMode === 'chime' && '🔔 Chime'}
                  {soundMode === 'mute' && '🔕 Muted'}
                </span>
              </button>

              {/* Mark All Read */}
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
          </div>

          {/* Test Sound Bar banner */}
          <div className="px-3.5 py-1.5 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between text-[11px] text-emerald-900">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time voice alerts enabled</span>
            </span>
            <button
              type="button"
              onClick={() => testNotificationSound()}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline active:scale-95 transition"
            >
              Test Alert 🔈
            </button>
          </div>

          {/* Notification List */}
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

      {/* Floating In-App Real-Time Toast Banner (WhatsApp / Push Notification Style) */}
      {activeToast && (
        <div className="fixed top-4 right-4 sm:right-6 z-[10000] max-w-sm w-[calc(100vw-32px)] sm:w-96 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-base shrink-0 shadow-xs">
            🔔
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                New Notification
              </span>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-bold text-white truncate">
              {activeToast.title}
            </p>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
              {activeToast.message}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNotificationClick(activeToast)}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-lg transition active:scale-95 shadow-2xs"
              >
                Open Case →
              </button>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
