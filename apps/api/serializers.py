from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, WeightLog, CompletedDay, TrainingSession, ExerciseLog


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "パスワードが一致しません"})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'username', 'height_cm', 'start_date', 'target_date',
            'equip_settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class WeightLogSerializer(serializers.ModelSerializer):
    week_diff = serializers.SerializerMethodField()

    class Meta:
        model = WeightLog
        fields = ['id', 'date', 'weight_kg', 'memo', 'week_diff', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_week_diff(self, obj):
        """前回からの差分"""
        prev = WeightLog.objects.filter(
            user=obj.user, date__lt=obj.date
        ).order_by('-date').first()
        if prev:
            return round(obj.weight_kg - prev.weight_kg, 1)
        return None


class CompletedDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletedDay
        fields = ['id', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']


class ExerciseLogSerializer(serializers.ModelSerializer):
    previous = serializers.SerializerMethodField()

    class Meta:
        model = ExerciseLog
        fields = [
            'id', 'session', 'date', 'exercise_name', 'set_number',
            'weight_kg', 'reps', 'rpe', 'memo', 'previous', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_previous(self, obj):
        """前回の同種目記録"""
        prev = ExerciseLog.objects.filter(
            user=obj.user,
            exercise_name=obj.exercise_name,
            date__lt=obj.date
        ).order_by('-date', '-set_number').first()
        if prev:
            return {
                'date': prev.date,
                'weight_kg': prev.weight_kg,
                'reps': prev.reps,
                'set_number': prev.set_number,
            }
        return None


class TrainingSessionSerializer(serializers.ModelSerializer):
    exercises = ExerciseLogSerializer(many=True, read_only=True)

    class Meta:
        model = TrainingSession
        fields = [
            'id', 'date', 'part', 'duration_min', 'memo',
            'exercises', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExerciseHistorySerializer(serializers.Serializer):
    """種目別の重量推移"""
    exercise_name = serializers.CharField()
    date = serializers.DateField()
    max_weight = serializers.FloatField()
    total_volume = serializers.FloatField()
