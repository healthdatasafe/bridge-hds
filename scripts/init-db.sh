#!/bin/bash
set -e

# Initialize the database accordingly to the configuration

# working dir fix
SCRIPT_FOLDER=$(cd $(dirname "$0"); pwd)
cd $SCRIPT_FOLDER/../storage-migrations
npx sequelize-cli db:migrate