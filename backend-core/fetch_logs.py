import paramiko

def fetch_logs():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('46.224.223.172', username='root', password='***REMOVED-CREDENTIAL***', timeout=10)
        stdin, stdout, stderr = ssh.exec_command('docker logs --tail 200 starta-backend-1')
        logs = stdout.read().decode('utf-8')
        err_logs = stderr.read().decode('utf-8')
        print(logs[-4000:])
        if err_logs:
            print("STDERR:", err_logs[-1000:])
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    fetch_logs()
