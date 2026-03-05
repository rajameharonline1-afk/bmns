param(
    [string]$Message = "init"
)

$root = Split-Path -Parent $PSScriptRoot
$env:PYTHONPATH = $root

alembic -c "$root\alembic.ini" revision --autogenerate -m $Message
