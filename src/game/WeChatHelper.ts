export class WeChatHelper {
  static setup() {
    this.preventPageScroll();
    this.preventDoubleTapZoom();
    this.preventGestureZoom();
    this.preventSelection();
    this.handlePortraitOverlay();
  }

  private static preventPageScroll() {
    const stop = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', stop, { passive: false });
    document.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }

  private static preventDoubleTapZoom() {
    let lastTouchEnd = 0;

    document.addEventListener(
      'touchend',
      (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false }
    );
  }

  private static preventGestureZoom() {
    document.addEventListener(
      'gesturestart',
      (e) => {
        e.preventDefault();
      },
      { passive: false } as EventListenerOptions
    );

    document.addEventListener(
      'gesturechange',
      (e) => {
        e.preventDefault();
      },
      { passive: false } as EventListenerOptions
    );

    document.addEventListener(
      'gestureend',
      (e) => {
        e.preventDefault();
      },
      { passive: false } as EventListenerOptions
    );
  }

  private static preventSelection() {
    document.addEventListener('selectstart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private static handlePortraitOverlay() {
    const overlay = document.getElementById('portrait-overlay');
    if (!overlay) return;

    const update = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      overlay.style.display = isLandscape ? 'flex' : 'none';
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
  }
}
