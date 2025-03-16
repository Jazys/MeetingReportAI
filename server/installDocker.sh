#!/bin/bash

set -e

# Mettre à jour les paquets et installer les dépendances nécessaires
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG officielle de Docker
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Ajouter le dépôt officiel de Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Mettre à jour les paquets et installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Vérifier l'installation de Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker --no-pager

echo "Docker installé avec succès. Version :"
docker --version

echo "Installation de Docker Compose..."
sudo apt install -y docker-compose-plugin

echo "Docker Compose installé avec succès. Version :"
docker compose version

# Ajouter l'utilisateur actuel au groupe Docker (nécessite une reconnexion pour prendre effet)
sudo usermod -aG docker $USER

echo "Ajout de l'utilisateur au groupe docker. Veuillez vous déconnecter et reconnecter pour appliquer les changements."
