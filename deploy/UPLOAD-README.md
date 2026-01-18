# CutList Optimizer - Deploy naar Hetzner

## Server Info
- **IP:** 46.224.215.142
- **URL:** http://46.224.215.142
- **User:** root
- **App path:** /opt/cutlist-optimizer

---

## Update Deployen

### 1. Build (Windows PowerShell)
```powershell
cd D:\CutListOptimizer
docker build -t cutlist-optimizer .
```

### 2. Upload naar server
```powershell
docker save -o cutlist.tar cutlist-optimizer
scp cutlist.tar root@46.224.215.142:/opt/cutlist-optimizer/
```

### 3. Activeren (SSH naar server)
```bash
ssh root@46.224.215.142
cd /opt/cutlist-optimizer
docker rm -f cutlist
docker load -i cutlist.tar
docker run -d -p 80:80 --restart unless-stopped --name cutlist cutlist-optimizer
```

---

## Handige Server Commands

| Actie | Command |
|-------|---------|
| Status | `docker ps` |
| Logs | `docker logs cutlist` |
| Logs live | `docker logs -f cutlist` |
| Herstarten | `docker restart cutlist` |
| Stoppen | `docker stop cutlist` |
| Verwijderen | `docker rm -f cutlist` |
| Server resources | `htop` |
| Disk space | `df -h` |

---

## Troubleshooting

### Container start niet
```bash
docker logs cutlist
```

### Poort 80 bezet
```bash
docker rm -f cutlist
docker run -d -p 80:80 --restart unless-stopped --name cutlist cutlist-optimizer
```

### Helemaal opnieuw
```bash
docker rm -f cutlist
docker rmi cutlist-optimizer
docker load -i cutlist.tar
docker run -d -p 80:80 --restart unless-stopped --name cutlist cutlist-optimizer
```

---

## Kosten
- Hetzner CX22: €3,79/maand
- Jaarlijks: ~€45
