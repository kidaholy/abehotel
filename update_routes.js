const fs = require('fs');

const pathMappings = {
  "app/reception/page.tsx": 'requiredPermissions={["reception:access"]}',
  "app/menu/page.tsx": 'requiredPermissions={["services:view", "cashier:access"]}',
  "app/display/page.tsx": 'requiredPermissions={["display:access"]}',
  "app/chef/page.tsx": 'requiredPermissions={["chef:access"]}',
  "app/chef/orders/page.tsx": 'requiredPermissions={["chef:access"]}',
  "app/cashier/transactions/page.tsx": 'requiredPermissions={["cashier:access", "reports:view"]}',
  "app/cashier/room-orders/page.tsx": 'requiredPermissions={["cashier:access"]}',
  "app/cashier/orders/page.tsx": 'requiredPermissions={["cashier:access"]}',
  "app/bar/page.tsx": 'requiredPermissions={["bar:access"]}',
  "app/admin/transfers/page.tsx": 'requiredPermissions={["stock:view", "store:view"]}',
  "app/admin/vip1-menu/page.tsx": 'requiredPermissions={["services:view"]}',
  "app/admin/vip2-menu/page.tsx": 'requiredPermissions={["services:view"]}',
  "app/admin/users/page.tsx": 'requiredPermissions={["users:view"]}',
  "app/admin/store/page.tsx": 'requiredPermissions={["store:view"]}',
  "app/admin/stock/page.tsx": 'requiredPermissions={["stock:view"]}',
  "app/admin/settings/page.tsx": 'requiredPermissions={["settings:view", "overview:view"]}',
  "app/admin/services/page.tsx": 'requiredPermissions={["services:view"]}',
  "app/admin/reception/page.tsx": 'requiredPermissions={["reception:access"]}',
  "app/admin/page.tsx": 'requiredPermissions={["overview:view"]}',
  "app/admin/orders/page.tsx": 'requiredPermissions={["overview:view", "orders:view", "cashier:access"]}',
  "app/admin/menu/page.tsx": 'requiredPermissions={["services:view"]}',
  "app/admin/business-intelligence/page.tsx": 'requiredPermissions={["reports:view"]}',
  "app/admin/reports/page.tsx": 'requiredPermissions={["reports:view"]}',
  "app/admin/reports/stock-usage/page.tsx": 'requiredPermissions={["reports:view", "stock:view"]}',
  "app/admin/reports/orders/page.tsx": 'requiredPermissions={["reports:view"]}',
  "app/admin/reports/inventory/page.tsx": 'requiredPermissions={["reports:view"]}',
  "app/admin/reports/bedroom-revenue/page.tsx": 'requiredPermissions={["reports:view"]}'
};

for (const [file, permission] of Object.entries(pathMappings)) {
  const filePath = `c:/Users/11/Desktop/Projects/abehotel/${file}`;
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/requiredPermissions=\{\[[^\]]+\]\}/g, permission);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
