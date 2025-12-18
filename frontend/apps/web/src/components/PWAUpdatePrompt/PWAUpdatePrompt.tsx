import { useRegisterSW } from "virtual:pwa-register/react"
import { RefreshCw, X } from "lucide-react"
import type React from "react"
import { useEffect, useRef } from "react"

export const PWAUpdatePrompt: React.FC = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered:", r)
      registrationRef.current = r ?? null
    },
    onRegisterError(error) {
      console.log("SW registration error", error)
    },
  })

  // バックグラウンドから復帰したときに更新チェック
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && registrationRef.current) {
        console.log("Page became visible, checking for SW updates...")
        registrationRef.current.update()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  if (!needRefresh) return null

  return (
    <div className='fixed bottom-4 right-4 z-50 animate-fade-in-up'>
      <div className='surface-raised rounded-lg p-4 max-w-sm shadow-lg'>
        <div className='flex items-start gap-3'>
          <div className='w-8 h-8 rounded-full bg-primary/10 grid place-items-center shrink-0'>
            <RefreshCw className='w-4 h-4 text-primary' />
          </div>
          <div className='flex-1 min-w-0'>
            <h3 className='text-sm font-semibold text-foreground'>アップデートがあります</h3>
            <p className='text-xs text-muted-foreground mt-1'>
              新しいバージョンが利用可能です。更新して最新機能をお使いください。
            </p>
            <div className='flex gap-2 mt-3'>
              <button
                type='button'
                onClick={() => updateServiceWorker(true)}
                className='px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-fast'
              >
                今すぐ更新
              </button>
              <button
                type='button'
                onClick={() => setNeedRefresh(false)}
                className='px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-neutral-hover transition-colors duration-fast'
              >
                後で
              </button>
            </div>
          </div>
          <button
            type='button'
            onClick={() => setNeedRefresh(false)}
            className='p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-fast'
            aria-label='閉じる'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  )
}
