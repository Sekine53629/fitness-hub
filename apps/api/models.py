from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Profile(models.Model):
    """ユーザープロフィール: 目標・設定値の保存"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    height_cm = models.FloatField(null=True, blank=True, verbose_name="身長(cm)")
    start_date = models.DateField(default='2026-04-07', verbose_name="開始日")
    target_date = models.DateField(default='2026-09-03', verbose_name="目標日")

    # 器具設定 (JSON: {"bw":true,"db":true,"bb":true,"bench":true,"band":false,"gym":true})
    equip_settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="器具設定"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "プロフィール"
        verbose_name_plural = "プロフィール"

    def __str__(self):
        return f"{self.user.username}のプロフィール"

    def save(self, *args, **kwargs):
        if not self.equip_settings:
            self.equip_settings = {
                "bw": True, "db": True, "bb": True,
                "bench": True, "band": False, "gym": True
            }
        super().save(*args, **kwargs)


class WeightLog(models.Model):
    """体重記録: 週1日曜計測"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_logs')
    date = models.DateField(verbose_name="計測日")
    weight_kg = models.FloatField(
        validators=[MinValueValidator(30), MaxValueValidator(300)],
        verbose_name="体重(kg)"
    )
    memo = models.CharField(max_length=200, blank=True, verbose_name="メモ")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "体重記録"
        verbose_name_plural = "体重記録"
        ordering = ['-date']
        unique_together = ['user', 'date']

    def __str__(self):
        return f"{self.date} - {self.weight_kg}kg"


class CompletedDay(models.Model):
    """トレーニング完了日: ストリーク計算用"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='completed_days')
    date = models.DateField(verbose_name="完了日")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "完了日"
        verbose_name_plural = "完了日"
        ordering = ['-date']
        unique_together = ['user', 'date']

    def __str__(self):
        return f"{self.date} 完了"


class TrainingSession(models.Model):
    """トレーニングセッション: 1回のジム訪問"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_sessions')
    date = models.DateField(verbose_name="日付")
    part = models.CharField(max_length=20, verbose_name="部位",
        choices=[
            ('chest', '胸'), ('back', '背中'), ('legs', '脚'),
            ('shoulders', '肩'), ('arms', '腕'), ('abs', '腹筋+有酸素'),
        ]
    )
    duration_min = models.IntegerField(null=True, blank=True, verbose_name="所要時間(分)")
    memo = models.TextField(blank=True, verbose_name="メモ")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "トレーニングセッション"
        verbose_name_plural = "トレーニングセッション"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.date} - {self.get_part_display()}"


class ExerciseLog(models.Model):
    """種目別記録: セッション内の各種目のウェイト・レップ・セット"""
    session = models.ForeignKey(
        TrainingSession, on_delete=models.CASCADE,
        related_name='exercises', null=True, blank=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exercise_logs')
    date = models.DateField(verbose_name="日付")
    exercise_name = models.CharField(max_length=100, verbose_name="種目名")
    set_number = models.IntegerField(default=1, verbose_name="セット番号")
    weight_kg = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name="重量(kg)"
    )
    reps = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="回数"
    )
    rpe = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="RPE(主観的運動強度)"
    )
    memo = models.CharField(max_length=200, blank=True, verbose_name="メモ")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "種目記録"
        verbose_name_plural = "種目記録"
        ordering = ['-date', 'exercise_name', 'set_number']

    def __str__(self):
        return f"{self.exercise_name} {self.weight_kg}kg x {self.reps}回"

    @classmethod
    def get_previous(cls, user, exercise_name):
        """前回の記録を取得"""
        return cls.objects.filter(
            user=user,
            exercise_name=exercise_name
        ).order_by('-date', '-set_number').first()

    @classmethod
    def get_history(cls, user, exercise_name, limit=10):
        """種目の履歴を取得(日付ごとのmax重量)"""
        from django.db.models import Max
        return cls.objects.filter(
            user=user,
            exercise_name=exercise_name
        ).values('date').annotate(
            max_weight=Max('weight_kg')
        ).order_by('-date')[:limit]
