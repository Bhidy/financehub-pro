import subprocess
try:
    cmd = ["ssh", "root@46.224.223.172", "docker compose -f /opt/starta/docker-compose.prod.yml logs --tail 100 backend"]
    result = subprocess.run(cmd, capture_output=True, text=True, input="StartaProd2026!\n", timeout=30)
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
except Exception as e:
    print(e)
