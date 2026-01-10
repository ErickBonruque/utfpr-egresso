#!/bin/bash

# Script de build para Vercel
echo "Iniciando build do Sistema CEA..."

# Instalar dependências
pip install -r requirements.txt

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Rodar migrações
python manage.py migrate --noinput

echo "Build concluído com sucesso!"
