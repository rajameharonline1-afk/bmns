from django.contrib.auth import get_user_model
from django.db import models


class Package(models.Model):
    name = models.CharField(max_length=120, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    speed_mbps = models.PositiveIntegerField()

    def __str__(self) -> str:
        return f"{self.name} ({self.speed_mbps} Mbps)"


class Subscriber(models.Model):
    user = models.OneToOneField(get_user_model(), on_delete=models.CASCADE)
    package = models.ForeignKey(Package, on_delete=models.PROTECT)
    account_no = models.CharField(max_length=64, unique=True)
    address = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.account_no


class BillingInvoice(models.Model):
    STATUS_CHOICES = [
        ("due", "Due"),
        ("paid", "Paid"),
        ("partial", "Partial"),
    ]

    subscriber = models.ForeignKey(Subscriber, on_delete=models.CASCADE, related_name="invoices")
    invoice_no = models.CharField(max_length=64, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="due")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.invoice_no
