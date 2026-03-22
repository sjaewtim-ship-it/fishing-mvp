export class MobileHelper {
  static ensurePortraitOverlay() {
    let overlay = document.getElementById('portrait-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'portrait-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.92)';
      overlay.style.color = '#fff';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.textAlign = 'center';
      overlay.style.fontSize = '24px';
      overlay.style.zIndex = '9999';
      overlay.style.padding = '24px';
      overlay.innerHTML = '请竖屏体验<br/>📱';
      document.body.appendChild(overlay);
    }

    const update = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      overlay!.style.display = isLandscape ? 'flex' : 'none';
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
  }
}
