from django.contrib import admin
from .models import Profile, WeightLog, CompletedDay, TrainingSession, ExerciseLog


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'height_cm', 'start_date', 'target_date']


@admin.register(WeightLog)
class WeightLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'weight_kg']
    list_filter = ['user', 'date']


@admin.register(CompletedDay)
class CompletedDayAdmin(admin.ModelAdmin):
    list_display = ['user', 'date']
    list_filter = ['user']


@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'part', 'duration_min']
    list_filter = ['user', 'part', 'date']


@admin.register(ExerciseLog)
class ExerciseLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'exercise_name', 'weight_kg', 'reps', 'set_number']
    list_filter = ['user', 'exercise_name', 'date']
    search_fields = ['exercise_name']
