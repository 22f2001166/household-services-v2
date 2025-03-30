from celery import Celery
from celery.schedules import crontab

# old style celery, capital words


def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_RESULT_BACKEND"],
        task_ignore_result=False,
        accept_content=["json"],
        result_serializer="json",
    )

    celery.conf.CELERYBEAT_SCHEDULE = {
        "send-daily-reminders-every-evening": {
            "task": "backend.tasks.send_daily_reminders",
            # "schedule": crontab(hour=18, minute=0),  # Runs daily at 6:00 PM
            "schedule": crontab(minute="*/2"),  # Runs every 2 minutes
        },
        "send-monthly-activity-report": {
            "task": "backend.tasks.send_monthly_activity_report",
            # Runs on the 1st of every month at 8 AM
            # "schedule": crontab(
            #     hour=8, minute=0, day_of_month=1
            # ),
            "schedule": crontab(
                minute="*/2", day_of_month=28
            ),  # Runs every 2 minutes on 28th of month
        },
    }

    celery.conf.update(app.config)
    return celery
