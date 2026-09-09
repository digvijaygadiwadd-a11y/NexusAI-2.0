export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  sourceType: 'preset';
  records: Record<string, any>[];
}

// 1. SaaS Subscription & Cohort Analytics
export const saasDataset: SampleDataset = {
  id: 'saas-metrics',
  name: 'SaaS B2B Subscription Analytics (2024-2025)',
  description: 'Multi-tier B2B cloud SaaS metrics including MRR, churn, customer acquisition costs, and support volume.',
  sourceType: 'preset',
  records: [
    { month: '2024-01', plan_tier: 'Enterprise', mrr: 145000, arr: 1740000, active_customers: 58, new_signups: 6, churned_customers: 1, cac: 5200, ltv: 62000, support_tickets: 42, net_promoter_score: 68 },
    { month: '2024-01', plan_tier: 'Professional', mrr: 88000, arr: 1056000, active_customers: 220, new_signups: 24, churned_customers: 4, cac: 1800, ltv: 14500, support_tickets: 85, net_promoter_score: 62 },
    { month: '2024-01', plan_tier: 'Growth', mrr: 42000, arr: 504000, active_customers: 420, new_signups: 60, churned_customers: 18, cac: 650, ltv: 4800, support_tickets: 110, net_promoter_score: 55 },
    { month: '2024-02', plan_tier: 'Enterprise', mrr: 152000, arr: 1824000, active_customers: 61, new_signups: 4, churned_customers: 1, cac: 5400, ltv: 63500, support_tickets: 39, net_promoter_score: 70 },
    { month: '2024-02', plan_tier: 'Professional', mrr: 94000, arr: 1128000, active_customers: 235, new_signups: 22, churned_customers: 7, cac: 1950, ltv: 14200, support_tickets: 92, net_promoter_score: 59 },
    { month: '2024-02', plan_tier: 'Growth', mrr: 45000, arr: 540000, active_customers: 450, new_signups: 55, churned_customers: 25, cac: 680, ltv: 4600, support_tickets: 124, net_promoter_score: 52 },
    { month: '2024-03', plan_tier: 'Enterprise', mrr: 168000, arr: 2016000, active_customers: 67, new_signups: 7, churned_customers: 1, cac: 4900, ltv: 66000, support_tickets: 45, net_promoter_score: 71 },
    { month: '2024-03', plan_tier: 'Professional', mrr: 99000, arr: 1188000, active_customers: 248, new_signups: 26, churned_customers: 13, cac: 2100, ltv: 13800, support_tickets: 104, net_promoter_score: 56 },
    { month: '2024-03', plan_tier: 'Growth', mrr: 47500, arr: 570000, active_customers: 475, new_signups: 65, churned_customers: 40, cac: 710, ltv: 4300, support_tickets: 148, net_promoter_score: 48 },
    { month: '2024-04', plan_tier: 'Enterprise', mrr: 175000, arr: 2100000, active_customers: 70, new_signups: 5, churned_customers: 2, cac: 5100, ltv: 65000, support_tickets: 48, net_promoter_score: 69 },
    { month: '2024-04', plan_tier: 'Professional', mrr: 101000, arr: 1212000, active_customers: 252, new_signups: 19, churned_customers: 15, cac: 2250, ltv: 13500, support_tickets: 112, net_promoter_score: 54 },
    { month: '2024-04', plan_tier: 'Growth', mrr: 46000, arr: 552000, active_customers: 460, new_signups: 42, churned_customers: 57, cac: 750, ltv: 4050, support_tickets: 165, net_promoter_score: 44 },
    { month: '2024-05', plan_tier: 'Enterprise', mrr: 184000, arr: 2208000, active_customers: 73, new_signups: 6, churned_customers: 3, cac: 5300, ltv: 64000, support_tickets: 52, net_promoter_score: 67 },
    { month: '2024-05', plan_tier: 'Professional', mrr: 103000, arr: 1236000, active_customers: 257, new_signups: 20, churned_customers: 15, cac: 2300, ltv: 13300, support_tickets: 118, net_promoter_score: 53 },
    { month: '2024-05', plan_tier: 'Growth', mrr: 44200, arr: 530400, active_customers: 442, new_signups: 38, churned_customers: 56, cac: 780, ltv: 3950, support_tickets: 172, net_promoter_score: 42 },
    { month: '2024-06', plan_tier: 'Enterprise', mrr: 196000, arr: 2352000, active_customers: 78, new_signups: 7, churned_customers: 2, cac: 5000, ltv: 67000, support_tickets: 50, net_promoter_score: 72 },
    { month: '2024-06', plan_tier: 'Professional', mrr: 108000, arr: 1296000, active_customers: 270, new_signups: 25, churned_customers: 12, cac: 2150, ltv: 13700, support_tickets: 98, net_promoter_score: 58 },
    { month: '2024-06', plan_tier: 'Growth', mrr: 48000, arr: 576000, active_customers: 480, new_signups: 70, churned_customers: 32, cac: 720, ltv: 4250, support_tickets: 135, net_promoter_score: 49 },
    { month: '2024-07', plan_tier: 'Enterprise', mrr: 181000, arr: 2172000, active_customers: 72, new_signups: 3, churned_customers: 9, cac: 6100, ltv: 59000, support_tickets: 76, net_promoter_score: 58 },
    { month: '2024-07', plan_tier: 'Professional', mrr: 97000, arr: 1164000, active_customers: 242, new_signups: 14, churned_customers: 42, cac: 2600, ltv: 12100, support_tickets: 142, net_promoter_score: 47 },
    { month: '2024-07', plan_tier: 'Growth', mrr: 41000, arr: 492000, active_customers: 410, new_signups: 30, churned_customers: 100, cac: 890, ltv: 3400, support_tickets: 210, net_promoter_score: 36 },
    { month: '2024-08', plan_tier: 'Enterprise', mrr: 192000, arr: 2304000, active_customers: 76, new_signups: 8, churned_customers: 4, cac: 5500, ltv: 62000, support_tickets: 58, net_promoter_score: 65 },
    { month: '2024-08', plan_tier: 'Professional', mrr: 104000, arr: 1248000, active_customers: 260, new_signups: 29, churned_customers: 11, cac: 2200, ltv: 13600, support_tickets: 102, net_promoter_score: 57 },
    { month: '2024-08', plan_tier: 'Growth', mrr: 46500, arr: 558000, active_customers: 465, new_signups: 82, churned_customers: 27, cac: 690, ltv: 4400, support_tickets: 128, net_promoter_score: 53 },
    { month: '2024-09', plan_tier: 'Enterprise', mrr: 208000, arr: 2496000, active_customers: 82, new_signups: 9, churned_customers: 3, cac: 5100, ltv: 68000, support_tickets: 54, net_promoter_score: 74 },
    { month: '2024-09', plan_tier: 'Professional', mrr: 112000, arr: 1344000, active_customers: 280, new_signups: 32, churned_customers: 12, cac: 2050, ltv: 14100, support_tickets: 95, net_promoter_score: 61 },
    { month: '2024-09', plan_tier: 'Growth', mrr: 51000, arr: 612000, active_customers: 510, new_signups: 85, churned_customers: 40, cac: 660, ltv: 4700, support_tickets: 120, net_promoter_score: 56 },
    { month: '2024-10', plan_tier: 'Enterprise', mrr: 219000, arr: 2628000, active_customers: 86, new_signups: 7, churned_customers: 3, cac: 4950, ltv: 69500, support_tickets: 51, net_promoter_score: 73 },
    { month: '2024-10', plan_tier: 'Professional', mrr: 118000, arr: 1416000, active_customers: 295, new_signups: 30, churned_customers: 15, cac: 2100, ltv: 13900, support_tickets: 101, net_promoter_score: 60 },
    { month: '2024-10', plan_tier: 'Growth', mrr: 54000, arr: 648000, active_customers: 540, new_signups: 72, churned_customers: 42, cac: 680, ltv: 4600, support_tickets: 125, net_promoter_score: 54 },
    { month: '2024-11', plan_tier: 'Enterprise', mrr: 231000, arr: 2772000, active_customers: 91, new_signups: 8, churned_customers: 3, cac: 4800, ltv: 71000, support_tickets: 49, net_promoter_score: 75 },
    { month: '2024-11', plan_tier: 'Professional', mrr: 124000, arr: 1488000, active_customers: 310, new_signups: 31, churned_customers: 16, cac: 2000, ltv: 14200, support_tickets: 99, net_promoter_score: 63 },
    { month: '2024-11', plan_tier: 'Growth', mrr: 58000, arr: 696000, active_customers: 580, new_signups: 80, churned_customers: 40, cac: 650, ltv: 4800, support_tickets: 118, net_promoter_score: 57 },
    { month: '2024-12', plan_tier: 'Enterprise', mrr: 245000, arr: 2940000, active_customers: 96, new_signups: 9, churned_customers: 4, cac: 4700, ltv: 73000, support_tickets: 48, net_promoter_score: 76 },
    { month: '2024-12', plan_tier: 'Professional', mrr: 131000, arr: 1572000, active_customers: 327, new_signups: 34, churned_customers: 17, cac: 1950, ltv: 14500, support_tickets: 94, net_promoter_score: 64 },
    { month: '2024-12', plan_tier: 'Growth', mrr: 62000, arr: 744000, active_customers: 620, new_signups: 90, churned_customers: 50, cac: 630, ltv: 4900, support_tickets: 115, net_promoter_score: 58 },
  ]
};

// 2. Global E-Commerce & Retail Transactions
export const ecommerceDataset: SampleDataset = {
  id: 'ecommerce-retail',
  name: 'Global E-Commerce Omnichannel Retail',
  description: 'Detailed order-level data capturing sales, profit margins, discounts, shipping, customer segments, and regional returns.',
  sourceType: 'preset',
  records: [
    { order_id: 'ORD-1001', order_date: '2024-01-05', region: 'North America', category: 'Technology', sub_category: 'Laptops', sales: 2499.00, quantity: 2, discount_pct: 0.05, shipping_cost: 35.00, profit: 540.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1002', order_date: '2024-01-07', region: 'Europe', category: 'Furniture', sub_category: 'Chairs', sales: 720.00, quantity: 4, discount_pct: 0.15, shipping_cost: 65.00, profit: 85.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1003', order_date: '2024-01-12', region: 'Asia-Pacific', category: 'Office Supplies', sub_category: 'Paper', sales: 145.00, quantity: 10, discount_pct: 0.00, shipping_cost: 12.00, profit: 42.00, customer_segment: 'Home Office', return_status: 'No' },
    { order_id: 'ORD-1004', order_date: '2024-01-18', region: 'North America', category: 'Technology', sub_category: 'Accessories', sales: 380.00, quantity: 5, discount_pct: 0.10, shipping_cost: 15.00, profit: 110.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1005', order_date: '2024-01-22', region: 'Latin America', category: 'Furniture', sub_category: 'Tables', sales: 1250.00, quantity: 2, discount_pct: 0.25, shipping_cost: 180.00, profit: -95.00, customer_segment: 'Corporate', return_status: 'Yes' },
    { order_id: 'ORD-1006', order_date: '2024-02-03', region: 'Europe', category: 'Technology', sub_category: 'Phones', sales: 1899.00, quantity: 2, discount_pct: 0.00, shipping_cost: 25.00, profit: 460.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1007', order_date: '2024-02-09', region: 'North America', category: 'Office Supplies', sub_category: 'Storage', sales: 490.00, quantity: 4, discount_pct: 0.20, shipping_cost: 40.00, profit: 35.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1008', order_date: '2024-02-14', region: 'Asia-Pacific', category: 'Technology', sub_category: 'Laptops', sales: 3600.00, quantity: 3, discount_pct: 0.10, shipping_cost: 55.00, profit: 720.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1009', order_date: '2024-02-21', region: 'North America', category: 'Furniture', sub_category: 'Bookcases', sales: 890.00, quantity: 1, discount_pct: 0.30, shipping_cost: 120.00, profit: -45.00, customer_segment: 'Home Office', return_status: 'Yes' },
    { order_id: 'ORD-1010', order_date: '2024-03-02', region: 'Europe', category: 'Office Supplies', sub_category: 'Binders', sales: 210.00, quantity: 8, discount_pct: 0.05, shipping_cost: 18.00, profit: 62.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1011', order_date: '2024-03-10', region: 'Asia-Pacific', category: 'Technology', sub_category: 'Accessories', sales: 540.00, quantity: 6, discount_pct: 0.00, shipping_cost: 22.00, profit: 165.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1012', order_date: '2024-03-17', region: 'North America', category: 'Technology', sub_category: 'Phones', sales: 2850.00, quantity: 3, discount_pct: 0.05, shipping_cost: 30.00, profit: 690.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1013', order_date: '2024-03-25', region: 'Latin America', category: 'Furniture', sub_category: 'Chairs', sales: 650.00, quantity: 3, discount_pct: 0.20, shipping_cost: 85.00, profit: -30.00, customer_segment: 'Consumer', return_status: 'Yes' },
    { order_id: 'ORD-1014', order_date: '2024-04-04', region: 'North America', category: 'Office Supplies', sub_category: 'Appliances', sales: 980.00, quantity: 2, discount_pct: 0.10, shipping_cost: 45.00, profit: 210.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1015', order_date: '2024-04-12', region: 'Europe', category: 'Technology', sub_category: 'Laptops', sales: 4200.00, quantity: 3, discount_pct: 0.00, shipping_cost: 45.00, profit: 980.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1016', order_date: '2024-04-22', region: 'Asia-Pacific', category: 'Furniture', sub_category: 'Tables', sales: 1600.00, quantity: 2, discount_pct: 0.15, shipping_cost: 140.00, profit: 140.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1017', order_date: '2024-05-08', region: 'North America', category: 'Technology', sub_category: 'Accessories', sales: 410.00, quantity: 4, discount_pct: 0.00, shipping_cost: 16.00, profit: 125.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1018', order_date: '2024-05-19', region: 'Europe', category: 'Office Supplies', sub_category: 'Paper', sales: 290.00, quantity: 15, discount_pct: 0.10, shipping_cost: 20.00, profit: 75.00, customer_segment: 'Home Office', return_status: 'No' },
    { order_id: 'ORD-1019', order_date: '2024-05-28', region: 'Latin America', category: 'Technology', sub_category: 'Phones', sales: 1950.00, quantity: 2, discount_pct: 0.15, shipping_cost: 60.00, profit: 290.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1020', order_date: '2024-06-03', region: 'North America', category: 'Technology', sub_category: 'Laptops', sales: 5100.00, quantity: 4, discount_pct: 0.05, shipping_cost: 60.00, profit: 1150.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1021', order_date: '2024-06-15', region: 'Europe', category: 'Furniture', sub_category: 'Chairs', sales: 940.00, quantity: 5, discount_pct: 0.10, shipping_cost: 70.00, profit: 180.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1022', order_date: '2024-06-25', region: 'Asia-Pacific', category: 'Office Supplies', sub_category: 'Storage', sales: 620.00, quantity: 5, discount_pct: 0.05, shipping_cost: 35.00, profit: 145.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1023', order_date: '2024-07-04', region: 'North America', category: 'Technology', sub_category: 'Phones', sales: 3200.00, quantity: 3, discount_pct: 0.00, shipping_cost: 32.00, profit: 790.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1024', order_date: '2024-07-16', region: 'Europe', category: 'Furniture', sub_category: 'Tables', sales: 1850.00, quantity: 2, discount_pct: 0.35, shipping_cost: 190.00, profit: -120.00, customer_segment: 'Consumer', return_status: 'Yes' },
    { order_id: 'ORD-1025', order_date: '2024-07-28', region: 'Asia-Pacific', category: 'Technology', sub_category: 'Laptops', sales: 2700.00, quantity: 2, discount_pct: 0.10, shipping_cost: 40.00, profit: 540.00, customer_segment: 'Home Office', return_status: 'No' },
    { order_id: 'ORD-1026', order_date: '2024-08-05', region: 'North America', category: 'Office Supplies', sub_category: 'Appliances', sales: 1200.00, quantity: 3, discount_pct: 0.05, shipping_cost: 50.00, profit: 320.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1027', order_date: '2024-08-18', region: 'Europe', category: 'Technology', sub_category: 'Accessories', sales: 680.00, quantity: 7, discount_pct: 0.10, shipping_cost: 25.00, profit: 190.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1028', order_date: '2024-08-27', region: 'Latin America', category: 'Office Supplies', sub_category: 'Paper', sales: 180.00, quantity: 12, discount_pct: 0.00, shipping_cost: 15.00, profit: 55.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1029', order_date: '2024-09-08', region: 'North America', category: 'Technology', sub_category: 'Laptops', sales: 6200.00, quantity: 5, discount_pct: 0.05, shipping_cost: 75.00, profit: 1420.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1030', order_date: '2024-09-20', region: 'Asia-Pacific', category: 'Furniture', sub_category: 'Chairs', sales: 1100.00, quantity: 6, discount_pct: 0.15, shipping_cost: 95.00, profit: 170.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1031', order_date: '2024-10-06', region: 'Europe', category: 'Technology', sub_category: 'Phones', sales: 3400.00, quantity: 3, discount_pct: 0.05, shipping_cost: 35.00, profit: 810.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1032', order_date: '2024-10-19', region: 'North America', category: 'Furniture', sub_category: 'Bookcases', sales: 1450.00, quantity: 2, discount_pct: 0.20, shipping_cost: 110.00, profit: 95.00, customer_segment: 'Home Office', return_status: 'No' },
    { order_id: 'ORD-1033', order_date: '2024-11-04', region: 'North America', category: 'Technology', sub_category: 'Accessories', sales: 890.00, quantity: 8, discount_pct: 0.00, shipping_cost: 28.00, profit: 285.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1034', order_date: '2024-11-15', region: 'Europe', category: 'Office Supplies', sub_category: 'Storage', sales: 780.00, quantity: 6, discount_pct: 0.10, shipping_cost: 42.00, profit: 180.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1035', order_date: '2024-11-26', region: 'Asia-Pacific', category: 'Technology', sub_category: 'Laptops', sales: 4800.00, quantity: 4, discount_pct: 0.05, shipping_cost: 55.00, profit: 1080.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1036', order_date: '2024-12-05', region: 'North America', category: 'Technology', sub_category: 'Laptops', sales: 7500.00, quantity: 6, discount_pct: 0.00, shipping_cost: 80.00, profit: 1850.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1037', order_date: '2024-12-14', region: 'Europe', category: 'Furniture', sub_category: 'Tables', sales: 2100.00, quantity: 3, discount_pct: 0.15, shipping_cost: 160.00, profit: 240.00, customer_segment: 'Corporate', return_status: 'No' },
    { order_id: 'ORD-1038', order_date: '2024-12-20', region: 'North America', category: 'Office Supplies', sub_category: 'Appliances', sales: 1350.00, quantity: 3, discount_pct: 0.10, shipping_cost: 48.00, profit: 340.00, customer_segment: 'Consumer', return_status: 'No' },
    { order_id: 'ORD-1039', order_date: '2024-12-28', region: 'Latin America', category: 'Technology', sub_category: 'Phones', sales: 2600.00, quantity: 2, discount_pct: 0.10, shipping_cost: 50.00, profit: 480.00, customer_segment: 'Corporate', return_status: 'No' }
  ]
};

// 3. Supply Chain & Inventory Management
export const supplyChainDataset: SampleDataset = {
  id: 'supply-chain',
  name: 'Supply Chain & Inventory Management',
  description: 'Warehouse SKUs, lead times, safety stocks, stockout incidents, unit economics, and inventory turns.',
  sourceType: 'preset',
  records: [
    { sku_id: 'SKU-001', product_name: 'Industrial Valve A1', warehouse: 'Central Hub', current_stock: 450, reorder_point: 200, lead_time_days: 14, unit_cost: 65.00, unit_price: 120.00, stockouts_last_90d: 0, inventory_turnover: 5.2 },
    { sku_id: 'SKU-002', product_name: 'Pneumatic Actuator X', warehouse: 'West Depot', current_stock: 35, reorder_point: 100, lead_time_days: 35, unit_cost: 180.00, unit_price: 340.00, stockouts_last_90d: 4, inventory_turnover: 1.8 },
    { sku_id: 'SKU-003', product_name: 'High-Torque Motor 5kW', warehouse: 'East Coast', current_stock: 80, reorder_point: 75, lead_time_days: 28, unit_cost: 420.00, unit_price: 780.00, stockouts_last_90d: 2, inventory_turnover: 3.4 },
    { sku_id: 'SKU-004', product_name: 'Pressure Sensor Pro', warehouse: 'Central Hub', current_stock: 620, reorder_point: 150, lead_time_days: 10, unit_cost: 45.00, unit_price: 95.00, stockouts_last_90d: 0, inventory_turnover: 7.1 },
    { sku_id: 'SKU-005', product_name: 'Steel Flange 4-inch', warehouse: 'South Depot', current_stock: 12, reorder_point: 80, lead_time_days: 42, unit_cost: 32.00, unit_price: 68.00, stockouts_last_90d: 5, inventory_turnover: 0.9 },
    { sku_id: 'SKU-006', product_name: 'Hydraulic Seal Kit', warehouse: 'Central Hub', current_stock: 890, reorder_point: 300, lead_time_days: 7, unit_cost: 18.00, unit_price: 45.00, stockouts_last_90d: 0, inventory_turnover: 8.5 },
    { sku_id: 'SKU-007', product_name: 'Thermal Relay Switch', warehouse: 'West Depot', current_stock: 45, reorder_point: 90, lead_time_days: 25, unit_cost: 75.00, unit_price: 150.00, stockouts_last_90d: 3, inventory_turnover: 2.1 },
    { sku_id: 'SKU-008', product_name: 'Copper Bushing 20mm', warehouse: 'East Coast', current_stock: 1250, reorder_point: 400, lead_time_days: 12, unit_cost: 8.50, unit_price: 22.00, stockouts_last_90d: 0, inventory_turnover: 6.8 },
    { sku_id: 'SKU-009', product_name: 'Ball Bearing 6002-2RS', warehouse: 'Central Hub', current_stock: 1500, reorder_point: 500, lead_time_days: 14, unit_cost: 5.20, unit_price: 16.00, stockouts_last_90d: 0, inventory_turnover: 9.4 },
    { sku_id: 'SKU-010', product_name: 'Variable Speed Drive 10HP', warehouse: 'South Depot', current_stock: 18, reorder_point: 40, lead_time_days: 45, unit_cost: 850.00, unit_price: 1650.00, stockouts_last_90d: 6, inventory_turnover: 1.2 },
    { sku_id: 'SKU-011', product_name: 'Precision Gearbox 1:10', warehouse: 'West Depot', current_stock: 65, reorder_point: 60, lead_time_days: 30, unit_cost: 310.00, unit_price: 590.00, stockouts_last_90d: 1, inventory_turnover: 3.1 },
    { sku_id: 'SKU-012', product_name: 'Flexible Coupling C3', warehouse: 'East Coast', current_stock: 320, reorder_point: 120, lead_time_days: 16, unit_cost: 38.00, unit_price: 85.00, stockouts_last_90d: 0, inventory_turnover: 4.8 },
  ]
};

// 4. Corporate Financial OpEx & Cashflow
export const opexDataset: SampleDataset = {
  id: 'corporate-opex',
  name: 'Corporate Financial OpEx & Budget Variance',
  description: 'Departmental spending, budget variances, vendor allocations, and over-budget risk indicators.',
  sourceType: 'preset',
  records: [
    { department: 'Engineering & Product', quarter: '2024-Q1', expense_category: 'Cloud Infrastructure', budget_usd: 240000, actual_spend_usd: 268000, variance_usd: 28000, vendor_name: 'AWS Cloud', status: 'Over Budget' },
    { department: 'Engineering & Product', quarter: '2024-Q1', expense_category: 'Software Licenses', budget_usd: 85000, actual_spend_usd: 82000, variance_usd: -3000, vendor_name: 'GitHub / Jira', status: 'On Track' },
    { department: 'Sales & Marketing', quarter: '2024-Q1', expense_category: 'Paid Acquisition', budget_usd: 320000, actual_spend_usd: 395000, variance_usd: 75000, vendor_name: 'Google Ads & LinkedIn', status: 'Critical Overspend' },
    { department: 'Sales & Marketing', quarter: '2024-Q1', expense_category: 'Events & Conferences', budget_usd: 90000, actual_spend_usd: 88000, variance_usd: -2000, vendor_name: 'Event Horizon', status: 'On Track' },
    { department: 'Customer Success', quarter: '2024-Q1', expense_category: 'Helpdesk & Telephony', budget_usd: 45000, actual_spend_usd: 47500, variance_usd: 2500, vendor_name: 'Zendesk / Twilio', status: 'Over Budget' },
    { department: 'General & Administrative', quarter: '2024-Q1', expense_category: 'Legal & Compliance', budget_usd: 60000, actual_spend_usd: 92000, variance_usd: 32000, vendor_name: 'Cooley LLP', status: 'Critical Overspend' },
    { department: 'Engineering & Product', quarter: '2024-Q2', expense_category: 'Cloud Infrastructure', budget_usd: 250000, actual_spend_usd: 295000, variance_usd: 45000, vendor_name: 'AWS Cloud', status: 'Critical Overspend' },
    { department: 'Engineering & Product', quarter: '2024-Q2', expense_category: 'Contractors', budget_usd: 110000, actual_spend_usd: 104000, variance_usd: -6000, vendor_name: 'Toptal', status: 'Under Budget' },
    { department: 'Sales & Marketing', quarter: '2024-Q2', expense_category: 'Paid Acquisition', budget_usd: 340000, actual_spend_usd: 430000, variance_usd: 90000, vendor_name: 'Google Ads & LinkedIn', status: 'Critical Overspend' },
    { department: 'Sales & Marketing', quarter: '2024-Q2', expense_category: 'PR & Content Agency', budget_usd: 65000, actual_spend_usd: 62000, variance_usd: -3000, vendor_name: 'SparkPR', status: 'On Track' },
    { department: 'Human Resources', quarter: '2024-Q2', expense_category: 'Recruiting Fees', budget_usd: 80000, actual_spend_usd: 94000, variance_usd: 14000, vendor_name: 'Hired / Korn Ferry', status: 'Over Budget' },
    { department: 'General & Administrative', quarter: '2024-Q2', expense_category: 'Facilities & Office', budget_usd: 120000, actual_spend_usd: 118000, variance_usd: -2000, vendor_name: 'WeWork Global', status: 'On Track' },
  ]
};

export const sampleDatasets: SampleDataset[] = [
  saasDataset,
  ecommerceDataset,
  supplyChainDataset,
  opexDataset
];
