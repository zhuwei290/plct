#!/bin/bash

cd "$(dirname "$0")"
if gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d postgres <<EOF
CREATE DATABASE $DB_NAME OWNER $DB_USERNAME ENCODING 'UTF8' DBCOMPATIBILITY 'PG';
EOF
then
  gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d $DB_NAME <schema.sql
  gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d $DB_NAME <data.sql
fi
exec tail -f /dev/null
