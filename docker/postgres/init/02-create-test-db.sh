#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
  SELECT 'CREATE DATABASE school_lab_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'school_lab_test')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "school_lab_test" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
