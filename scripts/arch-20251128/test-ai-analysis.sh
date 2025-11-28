#!/bin/bash

curl -X POST http://localhost:3000/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{"userId":"22e990b6-a888-4beb-9ac6-c9a145731542","startDate":"2025-10-14","endDate":"2025-10-20"}' \
  2>&1
