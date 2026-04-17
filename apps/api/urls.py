from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'weights', views.WeightLogViewSet, basename='weight')
router.register(r'completed', views.CompletedDayViewSet, basename='completed')
router.register(r'sessions', views.TrainingSessionViewSet, basename='session')
router.register(r'exercises', views.ExerciseLogViewSet, basename='exercise')

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.me, name='me'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),

    # CRUD endpoints
    path('', include(router.urls)),
]

"""
API Endpoints:

POST   /api/register/              - ユーザー登録
POST   /api/token/                 - ログイン(JWT取得)
POST   /api/token/refresh/         - トークンリフレッシュ
GET    /api/me/                    - ログインユーザー情報

GET/PUT /api/profile/              - プロフィール取得/更新

GET/POST    /api/weights/          - 体重記録一覧/新規
GET         /api/weights/summary/  - 体重サマリー
GET/PUT/DEL /api/weights/{id}/     - 体重記録 個別

GET/POST    /api/completed/        - 完了日一覧/新規
GET         /api/completed/streak/ - ストリーク

GET/POST    /api/sessions/         - セッション一覧/新規 (?date=&part=)
GET/PUT/DEL /api/sessions/{id}/    - セッション個別(exercises含む)

GET/POST    /api/exercises/              - 種目記録一覧/新規 (?exercise_name=&date=)
GET         /api/exercises/previous/     - 前回記録 (?exercise_name=)
GET         /api/exercises/history/      - 重量推移 (?exercise_name=&limit=)
GET         /api/exercises/personal_bests/ - 全種目PR一覧
GET/PUT/DEL /api/exercises/{id}/         - 種目記録 個別
"""
