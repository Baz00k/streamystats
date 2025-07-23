# Dockerless Installation

If you want to run streamystats but do not want to use docker, you can with a bit of elbow grease! This guide assumes you have at least basic linux and postgres knowledge.
This has been tested on **Debian Bookworm**.

## PostgreSQL

Streamystats depends on the vector extension so you might need to use the upstream postgresql repos or compile it yourself.

Installing PostgreSQL:
```bash
# NOTE: on Debian Bookworm, the default PostgreSQL version is 15.
apt install postgresql postgresql-client
systemctl enable --now postgresql@15-main.service
```

Since there is no pgvector package we need to compile it ourselves:
```bash
apt install git build-essential postgresql-server-dev-15

git clone https://github.com/pgvector/pgvector.git /tmp/pgvector
cd /tmp/pgvector
make
make install

# NOTE: optionally cleanup the dev requirements
apt remove build-essential postgresql-server-dev-15 clang-14 icu-devtools lib32gcc-s1 lib32stdc++6 libc6-i386 libclang-common-14-dev libclang-cpp14 libclang-rt-14-dev libclang1-14 libcurl3-nss libffi-dev libgc1 libicu-dev libncurses-dev libncurses6 libobjc-12-dev libobjc4 libpfm4 libpq-dev libtinfo-dev libxml2-dev libyaml-0-2 libz3-dev llvm-14 llvm-14-dev llvm-14-linker-tools llvm-14-runtime llvm-14-tools nss-plugin-pem postgresql-server-dev-15 python3-pygments python3-yaml
apt autoremove
```

### Creating the database

```bash
export PG_VER=15
export DB_NAME=jellystats
export DB_PASS=$(pwgen -s 24 1)

echo "Creating ${DB_NAME} role with password: ${DB_PASS}"
echo "CREATE USER ${DB_NAME} WITH LOGIN PASSWORD '${DB_PASS}';" | sudo -i -u postgres psql
echo "CREATE DATABASE ${DB_NAME} OWNER ${DB_NAME};" | sudo -i -u postgres psql

cat >> /etc/postgresql/${PG_VER}/main/pg_hba.conf << EOF
# ${DB_NAME}
host    ${DB_NAME}      ${DB_NAME}      127.0.0.1/32    scram-sha-256
host    ${DB_NAME}      ${DB_NAME}      ::1/128         scram-sha-256
EOF

export DATABASE_URL=postgresql://${DB_NAME}:${DB_PASS}@localhost:5432/${DB_NAME}
echo 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' | psql "$DATABASE_URL"
echo 'CREATE EXTENSION IF NOT EXISTS "vector";' | sudo -u postgres psql -d ${DB_NAME} # NOTE: need super user
```

## Streamystats

Everything except the database and systemd unit will be contain within `/opt/streamystats`, we will also use a nodeenv to keep everything seperate from the systems default node.

### Prepareing the nodeenv
Creating the nodeenv:
```bash
[ -d /opt/streamystats/nodeenv ] || nodeenv --prebuilt -n 23.11.1 /opt/streamystats/nodeenv
source /opt/streamystats/nodeenv/bin/activate
npm install -g pnpm
```

### Installing from source
Cloning the source:
```bash
git clone https://github.com/fredrikburmester/streamystats.git /opt/streamystats/src
```

Installing the database package:
```bash
cd /opt/streamystats/src/packages/database
pnpm install --frozen-lockfile
pnpm build
npx drizzle-kit migrate
pnpm db:status
```

Installing the job-server package:
```bash
cd /opt/streamystats/src/apps/job-server
pnpm install --frozen-lockfile
pnpm build
```

**If you want a different base URI e.g. /streamystats, you need to export NEXT_PUBLIC_BASE_PATH before building the next-app!**

Installing the next-app package:
```bash
cd /opt/streamystats/src/apps/nextjs-app
#export NEXT_PUBLIC_BASE_PATH=/streamstats
pnpm install --frozen-lockfile
pnpm build
```

### Configuration

**You should still have the DB_NAME and DB_PASS variables set from earlier, if not replace them with the correct values!**

This configuration listens on localhost so needs to be placed behind a reverse proxy. Change this as needed for your setup.

```bash
mkdir -p /opt/streamystats/etc
cat > /opt/streamystats/etc/db.env << EOF
DATABASE_URL=postgresql://${DB_NAME}:${DB_PASS}@localhost:5432/${DB_NAME}
TZ=UTC
EOF

cat > /opt/streamystats/etc/job-server.env << EOF
HOST=localhost
PORT=3005
EOF

cat > /opt/streamystats/etc/nextjs-app.env << EOF
HOST=localhost
PORT=3000
#NEXT_PUBLIC_BASE_PATH=/streamystats
JOB_SERVER_URL=http://localhost:3005
EOF
```

### Running with systemd
```bash
useradd --system --home /opt/streamystats --create-home --shell /usr/sbin/nologin --user-group streamystats
chown -R streamystats:streamystats /opt/streamystats/{src,etc}

cat > /lib/systemd/system/streamystats-db-migration.service << EOF
[Unit]
Description=Streamystats is a statistics service for Jellyfin, providing analytics and data visualization.
Requires=network-online.target
#Requires=sssd.service

BindsTo=postgresql@15-main.service
After=postgresql@15-main.service

[Service]
EnvironmentFile=/opt/streamystats/etc/db.env
Environment=PATH=/opt/streamystats/nodeenv/bin:/usr/bin:/bin
Environment=NODE_ENV=production
Type=oneshot
WorkingDirectory=/opt/streamystats/src/packages/database
ExecStart=/opt/streamystats/nodeenv/bin/npx drizzle-kit migrate
User=streamystats
Group=streamystats
PrivateTmp=true
SyslogIdentifier=streamystats-db-migration
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /lib/systemd/system/streamystats-job-server.service << EOF
[Unit]
Description=Streamystats is a statistics service for Jellyfin, providing analytics and data visualization.
Requires=network-online.target
#Requires=sssd.service
Requires=jellyfin.service
After=streamystats-db-migration.service

BindsTo=postgresql@15-main.service
After=postgresql@15-main.service

[Service]
EnvironmentFile=/opt/streamystats/etc/db.env
EnvironmentFile=/opt/streamystats/etc/job-server.env
Environment=PATH=/opt/streamystats/nodeenv/bin:/usr/bin:/bin
Environment=NODE_ENV=production
Type=simple
WorkingDirectory=/opt/streamystats/src/apps/job-server
ExecStart=/opt/streamystats/nodeenv/bin/pnpm start
User=streamystats
Group=streamystats
PrivateTmp=true
SyslogIdentifier=streamystats-job-server
StandardOutput=journal
StandardError=journal
Restart=always

[Install]
WantedBy=multi-user.target
EOF


cat > /lib/systemd/system/streamystats-nextjs-app.service << EOF
[Unit]
Description=Streamystats is a statistics service for Jellyfin, providing analytics and data visualization.
Requires=network-online.target
#Requires=sssd.service
Requires=streamystats-job-server.service

[Service]
EnvironmentFile=/opt/streamystats/etc/db.env
EnvironmentFile=/opt/streamystats/etc/nextjs-app.env
Environment=PATH=/opt/streamystats/nodeenv/bin:/usr/bin:/bin
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Type=simple
WorkingDirectory=/opt/streamystats/src/apps/nextjs-app
ExecStart=/opt/streamystats/nodeenv/bin/pnpm start
User=streamystats
Group=streamystats
PrivateTmp=true
SyslogIdentifier=streamystats-nextjs-app
StandardOutput=journal
StandardError=journal
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now streamystats-db-migration.service
systemctl enable --now streamystats-job-server.service
systemctl enable --now streamystats-nextjs-app.service
```
