if [ -z "$1" ]; then
    echo "Usage: ./upload.sh <ssh_target>"
    exit 1
fi

docker compose build app
docker save code-judge-backend | ssh -C "$1" docker load
