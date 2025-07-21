import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast } from '@/components/ui/toast'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type: ToastMessage['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastMessage['type'], duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const getVariant = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success': return 'success'
      case 'error': return 'destructive'
      case 'warning': return 'warning'
      default: return 'default'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={getVariant(toast.type)}
            onClose={() => removeToast(toast.id)}
          >
            <div>
              <div className="font-medium">
                {toast.type === 'success' && 'Success'}
                {toast.type === 'error' && 'Error'}
                {toast.type === 'warning' && 'Warning'}
                {toast.type === 'info' && 'Info'}
              </div>
              <div className="text-sm mt-1">{toast.message}</div>
            </div>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
