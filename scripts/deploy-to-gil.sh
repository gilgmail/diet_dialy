#!/bin/bash
# Shortcut script to deploy to Gil-Golden iPhone
# This is an alias for deploy-to-gil-golden.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/deploy-to-gil-golden.sh" "$@"
