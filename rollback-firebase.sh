#!/bin/bash

# Script para hacer rollback a la versión anterior estable en Firebase
# Versión objetivo: f0ccae (19/11/25, 6:18 p.m.)

echo "=== 🔄 ROLLBACK A VERSIÓN ANTERIOR ESTABLE ==="
echo ""
echo "Versión actual: eb71be (19/11/25, 7:12 p.m.)"
echo "Versión objetivo: f0ccae (19/11/25, 6:18 p.m.)"
echo ""

# Verificar autenticación
echo "1. Verificando autenticación..."
if ! firebase projects:list &>/dev/null; then
    echo "❌ No estás autenticado. Ejecuta primero: firebase login"
    exit 1
fi
echo "✅ Autenticado"

# Configurar proyecto
echo ""
echo "2. Configurando proyecto..."
firebase use avocat-legaltech-v3
echo "✅ Proyecto configurado"

# Listar versiones disponibles
echo ""
echo "3. Versiones disponibles:"
firebase hosting:releases:list 2>&1 | head -10

# Confirmar rollback
echo ""
echo "4. ¿Deseas hacer rollback a f0ccae? (s/n)"
read -r respuesta

if [[ "$respuesta" =~ ^[Ss]$ ]]; then
    echo ""
    echo "5. Ejecutando rollback..."
    firebase hosting:rollback --version f0ccae
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Rollback completado exitosamente"
        echo "La versión f0ccae está ahora activa en Firebase"
    else
        echo ""
        echo "❌ Error al hacer rollback"
        exit 1
    fi
else
    echo ""
    echo "❌ Rollback cancelado"
    exit 0
fi

