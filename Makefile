.PHONY: proto-gen up down logs seed build-all clean

proto-gen:
	./scripts/proto-gen.sh

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	./scripts/seed-data.sh

build-all:
	docker compose build

clean:
	docker compose down -v --remove-orphans
