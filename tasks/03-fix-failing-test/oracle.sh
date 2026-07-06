#!/usr/bin/env bash
cat > cart.js <<'EOF'
export const totalCents = (items) => {
  let total = 0;
  for (const item of items) {
    // discountPercent is an integer like 10 for 10%
    const discounted = item.priceCents * (1 - (item.discountPercent ?? 0) / 100);
    total += Math.round(discounted) * item.quantity;
  }
  return total;
};

export const itemCount = (items) => items.reduce((count, item) => count + item.quantity, 0);
EOF
