# CutList Optimizer - Hetzner VPS Deployment

## Stap 1: Hetzner Account & Server (5 min)

1. Ga naar https://console.hetzner.cloud/
2. Maak account aan (verificatie kan 1-24 uur duren)
3. Maak een nieuw Project aan: "3BM Tools"
4. Klik "Add Server":
   - **Location:** Nuremberg of Falkenstein
   - **Image:** Ubuntu 24.04
   - **Type:** CX22 (€3,79/mnd) - Shared vCPU
   - **SSH Key:** Voeg je public key toe (of maak nieuwe)
   - **Name:** cutlist-optimizer
5. Klik "Create & Buy Now"
6. Noteer het IP adres

## Stap 2: Server Configureren (5 min)

SSH naar je server:
```bash
ssh root@JOUW_IP
```

Download en run setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/3bm/cutlist/main/deploy/setup-server.sh | bash
```

Of handmatig:
```bash
# Docker installeren
curl -fsSL https://get.docker.com | sh

# Firewall
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

# Directory
mkdir -p /opt/cutlist-optimizer
```

## Stap 3: App Deployen (5 min)

### Optie A: Via Windows script

1. Open `D:\CutListOptimizer\deploy\deploy-to-hetzner.bat`
2. Pas `SERVER_IP` aan
3. Dubbelklik om te runnen

### Optie B: Handmatig

Op je Windows PC (met Docker Desktop):
```powershell
cd D:\CutListOptimizer
docker build -t cutlist-optimizer .
docker save cutlist-optimizer | gzip > cutlist.tar.gz
scp cutlist.tar.gz root@JOUW_IP:/opt/cutlist-optimizer/
```

Op de server:
```bash
cd /opt/cutlist-optimizer
gunzip -c cutlist.tar.gz | docker load
docker run -d -p 80:80 --restart unless-stopped --name cutlist cutlist-optimizer
```

## Stap 4: (Optioneel) HTTPS met eigen domein

1. DNS: Maak A-record `cutlist.3bm.nl` → `JOUW_IP`
2. Pas `/opt/cutlist-optimizer/Caddyfile` aan:
```
cutlist.3bm.nl {
    reverse_proxy cutlist:80
}
```
3. Restart: `docker compose restart caddy`

Caddy regelt automatisch Let's Encrypt certificaat!

## Updates deployen

```bash
# Op Windows:
deploy-to-hetzner.bat

# Of handmatig op server:
docker pull ghcr.io/3bm-bouwkunde/cutlist-optimizer:latest
docker compose down && docker compose up -d
```

## Kosten

- Server CX22: €3,79/mnd
- Domein (optioneel): ~€10/jaar
- **Totaal: ~€45/jaar**

## Troubleshooting

```bash
# Logs bekijken
docker logs cutlist-optimizer

# Container status
docker ps

# Herstart
docker restart cutlist-optimizer

# Alles opnieuw
docker compose down && docker compose up -d
```
