import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { getOnlineStatus, isNativeApp, subscribeOnlineStatus } from '@/lib/native';

/** Android app only: tells the user when the device has no connection. Renders nothing on the web. */
export default function NativeOfflineBanner() {
  const online = useSyncExternalStore(subscribeOnlineStatus, getOnlineStatus, () => true);
  if (!isNativeApp || online) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-xs font-semibold text-black shadow-lg">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You're offline. ZorvanI ERP will reconnect automatically — changes can't be saved until then.</span>
    </div>
  );
}
