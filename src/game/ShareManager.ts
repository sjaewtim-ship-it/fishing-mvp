import Phaser from 'phaser';

export class ShareManager {
  static saveResultPoster(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    scene.game.renderer.snapshotArea(x, y, width, height, (image: HTMLImageElement) => {
      if (!image) {
        console.error('snapshotArea failed');
        return;
      }

      const a = document.createElement('a');
      a.href = image.src;
      a.download = `fishing_poster_${Date.now()}.png`;
      a.click();

      console.log('share_poster_saved');
    });
  }
}
