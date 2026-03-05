from fastapi import APIRouter

from app.api.routes import automation, auth, clients, configuration_items, dashboard, invoices, mikrotik_servers, network_devices, olts, onu_inventory, plans, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(network_devices.router, prefix="/network-devices", tags=["network-devices"])
api_router.include_router(mikrotik_servers.router, prefix="/mikrotik-servers", tags=["mikrotik-servers"])
api_router.include_router(olts.router, prefix="/olts", tags=["olts"])
api_router.include_router(onu_inventory.router, prefix="/onu-inventory", tags=["onu-inventory"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(configuration_items.router, prefix="/configuration/items", tags=["configuration-items"])
api_router.include_router(automation.router, prefix="/automation", tags=["automation"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
