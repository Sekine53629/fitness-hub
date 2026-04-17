from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Max, Sum, F
from django.utils import timezone
from datetime import timedelta

from .models import Profile, WeightLog, CompletedDay, TrainingSession, ExerciseLog
from .serializers import (
    UserRegistrationSerializer, UserSerializer, ProfileSerializer,
    WeightLogSerializer, CompletedDaySerializer,
    TrainingSessionSerializer, ExerciseLogSerializer,
)


# ── Auth ──
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
def me(request):
    """ログインユーザーの情報"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# ── Profile ──
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


# ── Weight Log ──
class WeightLogViewSet(viewsets.ModelViewSet):
    serializer_class = WeightLogSerializer

    def get_queryset(self):
        return WeightLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """体重サマリー: 初回/最新/変化量/ストリーク"""
        logs = self.get_queryset()
        if not logs.exists():
            return Response({'count': 0})

        first = logs.order_by('date').first()
        latest = logs.order_by('-date').first()
        return Response({
            'count': logs.count(),
            'first': {'date': first.date, 'kg': first.weight_kg},
            'latest': {'date': latest.date, 'kg': latest.weight_kg},
            'total_diff': round(latest.weight_kg - first.weight_kg, 1),
        })


# ── Completed Days ──
class CompletedDayViewSet(viewsets.ModelViewSet):
    serializer_class = CompletedDaySerializer

    def get_queryset(self):
        return CompletedDay.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def streak(self, request):
        """現在のストリーク計算"""
        days = set(
            self.get_queryset().values_list('date', flat=True)
        )
        today = timezone.now().date()
        count = 0
        d = today
        while d in days:
            count += 1
            d -= timedelta(days=1)
        return Response({'streak': count, 'total_days': len(days)})


# ── Training Sessions ──
class TrainingSessionViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingSessionSerializer

    def get_queryset(self):
        qs = TrainingSession.objects.filter(user=self.request.user)
        # フィルター: ?date=2026-04-16 or ?part=chest
        date = self.request.query_params.get('date')
        part = self.request.query_params.get('part')
        if date:
            qs = qs.filter(date=date)
        if part:
            qs = qs.filter(part=part)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Exercise Logs ──
class ExerciseLogViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseLogSerializer

    def get_queryset(self):
        qs = ExerciseLog.objects.filter(user=self.request.user)
        # フィルター: ?exercise_name=MTSチェストプレス&date=2026-04-16
        name = self.request.query_params.get('exercise_name')
        date = self.request.query_params.get('date')
        if name:
            qs = qs.filter(exercise_name=name)
        if date:
            qs = qs.filter(date=date)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def previous(self, request):
        """種目の前回記録を取得: ?exercise_name=MTSチェストプレス"""
        name = request.query_params.get('exercise_name')
        if not name:
            return Response({'error': 'exercise_name required'}, status=400)

        prev = ExerciseLog.get_previous(request.user, name)
        if prev:
            return Response({
                'exercise_name': name,
                'date': prev.date,
                'weight_kg': prev.weight_kg,
                'reps': prev.reps,
                'set_number': prev.set_number,
            })
        return Response({'exercise_name': name, 'date': None})

    @action(detail=False, methods=['get'])
    def history(self, request):
        """種目の重量推移: ?exercise_name=MTSチェストプレス&limit=20"""
        name = request.query_params.get('exercise_name')
        if not name:
            return Response({'error': 'exercise_name required'}, status=400)

        limit = int(request.query_params.get('limit', 20))
        history = ExerciseLog.get_history(request.user, name, limit)
        return Response({
            'exercise_name': name,
            'history': list(history),
        })

    @action(detail=False, methods=['get'])
    def personal_bests(self, request):
        """全種目のPR(自己ベスト)一覧"""
        pbs = ExerciseLog.objects.filter(
            user=request.user
        ).values('exercise_name').annotate(
            max_weight=Max('weight_kg')
        ).order_by('exercise_name')
        return Response(list(pbs))
