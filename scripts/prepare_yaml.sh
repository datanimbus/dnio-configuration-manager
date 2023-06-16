#!/bin/bash

set -e

echo "****************************************************"
echo "data.stack:cm :: Copying yaml file "
echo "****************************************************"
if [ ! -d yamlFiles ]; then
    mkdir yamlFiles
fi

TAG=`cat CURRENT_CM`

rm -rf yamlFiles/cm.*
cp cm.yaml yamlFiles/cm.$TAG.yaml
cd yamlFiles/
echo "****************************************************"
echo "data.stack:cm :: Preparing yaml file "
echo "****************************************************"

sed -i.bak s/__release__/$TAG/ cm.$TAG.yaml

echo "****************************************************"
echo "data.stack:cm :: yaml file saved"
echo "****************************************************"
