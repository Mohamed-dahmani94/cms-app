#!/bin/bash
# Script pour pousser les modifications sur GitHub facilement
cd /Users/mac/Documents/programation/cms-app

MESSAGE=${1:-"update: $(date '+%Y-%m-%d %H:%M')"}

git add .
git commit -m "$MESSAGE"
GIT_SSH_COMMAND="ssh -i /Users/mac/Documents/programation/cms-app/.ssh_key -o StrictHostKeyChecking=no" git push origin main

echo "✅ Modifications poussées sur GitHub avec succès!"
