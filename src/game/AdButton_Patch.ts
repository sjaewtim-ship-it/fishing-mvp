// ===== 高转化广告按钮 =====

const reviveY = baseY + 120;

// 背景（更亮 + 更大）
const revive = this.add.rectangle(375, reviveY, 420, 100, 0xff8c00)
  .setInteractive({ useHandCursor: true })
  .setStrokeStyle(4, 0xffffff, 0.25);

// 高亮闪烁（制造诱惑）
this.tweens.add({
  targets: revive,
  scale: 1.06,
  duration: 600,
  yoyo: true,
  repeat: -1,
});

// 主文案（更强刺激）
this.add.text(375, reviveY - 12, '🔥 立即复活再来一杆', {
  fontSize: '32px',
  color: '#ffffff',
  fontStyle: 'bold',
}).setOrigin(0.5);

// 副文案（告诉用户为什么点）
this.add.text(375, reviveY + 22, '这次很可能出大货！', {
  fontSize: '22px',
  color: '#fff3cd',
}).setOrigin(0.5);

// 点击逻辑
revive.on('pointerdown', () => {
  SimpleAudio.click();
  AnalyticsManager.instance.onAdView('revive');

  SaveSync.save();

  this.scene.start('FishingScene');
});
