#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up configuration directories and files...${NC}"

# Source environment variables if .env.dev exists and CONFIG_ROOT is not set
if [ -z "$CONFIG_ROOT" ] && [ -f ".env.dev" ]; then
    echo "Loading environment variables from .env.dev..."
    source .env.dev
fi

# Check if CONFIG_ROOT is set
if [ -z "$CONFIG_ROOT" ]; then
    echo -e "${RED}Error: CONFIG_ROOT environment variable is not set${NC}"
    echo "Please make sure to source your environment file (e.g., source .env.dev)"
    exit 1
fi

echo -e "${YELLOW}Using CONFIG_ROOT: $CONFIG_ROOT${NC}"

# Create directories with error handling
echo "Creating configuration directories..."
mkdir -p "${CONFIG_ROOT}/loki" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/loki${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/otelcol" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/otelcol${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/postgres-data" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/postgres-data${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/redis-data" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/redis-data${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/grafana/data" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/grafana/data${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/grafana/provisioning/datasources" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/grafana/provisioning/datasources${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/grafana/provisioning/plugins" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/grafana/provisioning/plugins${NC}"; exit 1; }
mkdir -p "${CONFIG_ROOT}/grafana/provisioning/alerting" || { echo -e "${RED}Failed to create ${CONFIG_ROOT}/grafana/provisioning/alerting${NC}"; exit 1; }

# Function to process config files with bash variable substitution
process_config_file() {
    local input_file=$1
    local output_file=$2
    
    echo "  - Processing $(basename "$input_file")..."
    
    # Use bash to evaluate the template (handles ${VAR:-default} syntax)
    eval "cat <<EOF
$(cat "$input_file")
EOF" > "$output_file" || { 
        echo -e "${RED}Failed to generate $output_file${NC}"; 
        exit 1; 
    }
}

# Process config files with environment variable substitution
echo "Processing configuration files..."

# Loki config
if [ -f "infra/loki/config.yml" ]; then
    process_config_file "infra/loki/config.yml" "${CONFIG_ROOT}/loki/config.yml"
else
    echo -e "${RED}Error: No loki config file found at infra/loki/config.yml${NC}"
    exit 1
fi

# OtelCol config
if [ -f "infra/otelcol/config.yml" ]; then
    process_config_file "infra/otelcol/config.yml" "${CONFIG_ROOT}/otelcol/config.yml"
else
    echo -e "${RED}Error: No otelcol config file found at infra/otelcol/config.yml${NC}"
    exit 1
fi

# Grafana datasource provisioning config  
if [ -f "infra/grafana/provisioning/datasources/loki.yml" ]; then
    process_config_file "infra/grafana/provisioning/datasources/loki.yml" "${CONFIG_ROOT}/grafana/provisioning/datasources/loki.yml"
else
    echo -e "${RED}Error: No grafana datasource config file found at infra/grafana/provisioning/datasources/loki.yml${NC}"
    exit 1
fi

# Skip dashboard provisioning - keep it simple with just Loki datasource
echo "  - Skipping dashboard provisioning (keeping setup simple)"

echo -e "${GREEN}Configuration setup complete!${NC}"
echo -e "${GREEN}Config files generated in: $CONFIG_ROOT${NC}" 