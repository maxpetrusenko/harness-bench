#!/usr/bin/env bash
set -euo pipefail
node -e "
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('data.json'));
const totals={count:data.length,sum:data.reduce((a,r)=>a+r.value,0),labels:[...new Set(data.map(r=>r.label))].sort()};
fs.writeFileSync('totals.json',JSON.stringify(totals,null,2));
"
node verify-local.js
