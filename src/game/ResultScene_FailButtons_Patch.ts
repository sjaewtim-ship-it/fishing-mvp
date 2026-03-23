// patch 代码片段：仅作历史参考，不是当前主流程中的可运行模块。
// 替换失败按钮区域代码片段
// 用这个覆盖你当前 ResultScene 里的失败按钮部分

// ===== 按钮区优化版 =====

const baseY = 560;

// 👉 主按钮：再试一次（最大 + 最亮）
const retry = this.add.rectangle(375, baseY, 420, 100, 0x3498db)
  .setInteractive({ useHandCursor: true })
  .setStrokeStyle(3, 0xffffff, 0.2);

this.add.text(375, baseY, '🎣 再试一次', {
  fontSize: '34px',
  color: '#ffffff',
  fontStyle: 'bold',
}).setOrigin(0.5);

this.tweens.add({
  targets: retry,
  scale: 1.05,
  duration: 800,
  yoyo: true,
  repeat: -1,
});

retry.on('pointerdown', () => {
  SimpleAudio.click();
  this.scene.start('FishingScene');
});


// 👉 次按钮：广告复活（带收益感）
const reviveY = baseY + 120;

const revive = this.add.rectangle(375, reviveY, 380, 90, 0xf39c12)
  .setInteractive({ useHandCursor: true })
  .setStrokeStyle(3, 0xffffff, 0.16);

this.add.text(375, reviveY, '🔥 看广告立即再来一次', {
  fontSize: '28px',
  color: '#ffffff',
  fontStyle: 'bold',
}).setOrigin(0.5);

revive.on('pointerdown', () => {
  SimpleAudio.click();
  AnalyticsManager.instance.onAdView('revive');
  SaveSync.save();
  this.scene.start('FishingScene');
});


// 👉 弱按钮：恢复体力（降级处理）
const recoverY = reviveY + 110;

const recover = this.add.rectangle(375, recoverY, 320, 70, 0x16a085)
  .setInteractive({ useHandCursor: true })
  .setAlpha(0.85);

this.add.text(375, recoverY, '恢复体力（广告）', {
  fontSize: '24px',
  color: '#e8f8f5',
}).setOrigin(0.5);

recover.on('pointerdown', () => {
  SimpleAudio.click();
  AnalyticsManager.instance.onAdView('recover_energy');
  EnergyManager.instance.addEnergy(3);
  SaveSync.save();
  this.scene.start('MainScene');
});


// 👉 返回（最弱）
const backY = recoverY + 100;

const back = this.add.rectangle(375, backY, 220, 60, 0xe74c3c)
  .setInteractive({ useHandCursor: true })
  .setAlpha(0.75);

this.add.text(375, backY, '返回', {
  fontSize: '22px',
  color: '#ffffff',
}).setOrigin(0.5);

back.on('pointerdown', () => {
  SimpleAudio.click();
  this.scene.start('MainScene');
});
