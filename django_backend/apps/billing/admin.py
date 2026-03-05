from django.contrib import admin

from .models import BillingInvoice, Package, Subscriber


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("name", "speed_mbps", "price")
    search_fields = ("name",)


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ("account_no", "user", "package", "is_active")
    list_filter = ("is_active",)
    search_fields = ("account_no", "user__username", "user__email")


@admin.register(BillingInvoice)
class BillingInvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_no", "subscriber", "amount", "status", "due_date")
    list_filter = ("status",)
    search_fields = ("invoice_no", "subscriber__account_no")
