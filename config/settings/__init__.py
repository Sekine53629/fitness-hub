"""
Settings module for Fitness Hub
Automatically imports the appropriate settings based on environment
"""
import os

env = os.environ.get('DJANGO_ENV', 'development')

if env == 'production':
    from .production import *
else:
    from .development import *
