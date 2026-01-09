import { useState, useEffect, useCallback, useRef, RefObject } from 'react'

type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface SwipeState {
  startX: number
  startY: number
  endX: number
  endY: number
  direction: SwipeDirection | null
  distance: number
}

interface UseSwipeOptions {
  /** Minimum distance in pixels to register a swipe */
  threshold?: number
  /** Callback when swipe left is detected */
  onSwipeLeft?: () => void
  /** Callback when swipe right is detected */
  onSwipeRight?: () => void
  /** Callback when swipe up is detected */
  onSwipeUp?: () => void
  /** Callback when swipe down is detected */
  onSwipeDown?: () => void
  /** Callback with swipe details during swipe */
  onSwiping?: (state: SwipeState) => void
  /** Whether to prevent default behavior */
  preventDefault?: boolean
}

interface UseSwipeReturn {
  /** Whether a swipe is currently in progress */
  isSwiping: boolean
  /** Current swipe state */
  swipeState: SwipeState
  /** Ref handlers to attach to element */
  handlers: {
    onTouchStart: (e: TouchEvent) => void
    onTouchMove: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
  }
}

const initialState: SwipeState = {
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  direction: null,
  distance: 0,
}

export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  options: UseSwipeOptions = {}
): UseSwipeReturn {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwiping,
    preventDefault = false,
  } = options

  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>(initialState)
  const stateRef = useRef<SwipeState>(initialState)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) e.preventDefault()

    const touch = e.touches[0]
    const state: SwipeState = {
      startX: touch.clientX,
      startY: touch.clientY,
      endX: touch.clientX,
      endY: touch.clientY,
      direction: null,
      distance: 0,
    }

    stateRef.current = state
    setSwipeState(state)
    setIsSwiping(true)
  }, [preventDefault])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping) return
    if (preventDefault) e.preventDefault()

    const touch = e.touches[0]
    const { startX, startY } = stateRef.current

    const endX = touch.clientX
    const endY = touch.clientY
    const deltaX = endX - startX
    const deltaY = endY - startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    let direction: SwipeDirection | null = null
    let distance = 0

    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left'
      distance = absX
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
      distance = absY
    }

    const state: SwipeState = {
      startX,
      startY,
      endX,
      endY,
      direction,
      distance,
    }

    stateRef.current = state
    setSwipeState(state)
    onSwiping?.(state)
  }, [isSwiping, preventDefault, onSwiping])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isSwiping) return

    const { direction, distance } = stateRef.current

    if (distance >= threshold && direction) {
      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }

    setIsSwiping(false)
    setSwipeState(initialState)
    stateRef.current = initialState
  }, [isSwiping, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault])

  return {
    isSwiping,
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}

/**
 * Hook to detect swipe to go back (swipe right from left edge)
 */
export function useSwipeBack(onBack: () => void, options: { edgeWidth?: number } = {}) {
  const { edgeWidth = 30 } = options
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false)
  const startXRef = useRef(0)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch.clientX <= edgeWidth) {
        setIsEdgeSwipe(true)
        startXRef.current = touch.clientX
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe) return
      // Could add visual feedback here
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe) return

      const touch = e.changedTouches[0]
      const distance = touch.clientX - startXRef.current

      if (distance > 100) {
        onBack()
      }

      setIsEdgeSwipe(false)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isEdgeSwipe, onBack, edgeWidth])

  return { isEdgeSwipe }
}
