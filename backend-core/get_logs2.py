import pexpect
import sys

child = pexpect.spawn('ssh root@46.224.223.172 "docker compose -f /opt/starta/docker-compose.prod.yml logs --tail 50 backend"')
child.expect('password:')
child.sendline('***REMOVED-CREDENTIAL***')
child.expect(pexpect.EOF, timeout=30)
print(child.before.decode('utf-8'))
