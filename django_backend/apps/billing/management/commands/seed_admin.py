from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update default BMNS Django admin account"

    def handle(self, *args, **options):
        user_model = get_user_model()
        username = "admin"
        password = "1234"
        email = "admin@bmns.local"

        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        if created:
            self.stdout.write(self.style.SUCCESS("Created Django admin: admin / 1234"))
        else:
            self.stdout.write(self.style.SUCCESS("Updated Django admin password: admin / 1234"))
