#!/bin/sh
# Runs once, when the MySQL data volume is first created.
# The integration tests use their own database so they never touch real data.
set -e

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`$MYSQL_TEST_DATABASE\`;
GRANT ALL PRIVILEGES ON \`$MYSQL_TEST_DATABASE\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
