const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getDashboardStats = async (req, res) => {
    try {
        const [debtRes, transitRes, profitRes, overdueRes] = await Promise.all([
            pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN i.currency = 'TMT' THEN i.amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) as debt_tmt,
                    COALESCE(SUM(CASE WHEN i.currency = 'USD' THEN i.amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) as debt_usd
                FROM invoices i
                WHERE i.status != 'paid'
            `),
            pool.query(`
                SELECT 
                    SUM(CASE WHEN currency = 'TMT' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END) as transit_tmt,
                    SUM(CASE WHEN currency = 'USD' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END) as transit_usd
                FROM shipments 
                WHERE status IN ('ordered', 'in_transit', 'customs')
            `),
            pool.query(`
                WITH monthly_revenue AS (
                    SELECT 
                        COALESCE(SUM(CASE WHEN i.currency = 'TMT' THEN i.amount ELSE 0 END), 0) as rev_tmt,
                        COALESCE(SUM(CASE WHEN i.currency = 'USD' THEN i.amount ELSE 0 END), 0) as rev_usd
                    FROM invoices i
                    WHERE i.status = 'paid' 
                    AND EXTRACT(MONTH FROM i.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM i.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                ),
                monthly_expenses AS (
                    SELECT 
                        COALESCE(SUM(CASE WHEN s.currency = 'TMT' THEN s.purchase_cost + COALESCE(s.logistics_cost, 0) + COALESCE(s.customs_fee, 0) ELSE 0 END), 0) as exp_tmt,
                        COALESCE(SUM(CASE WHEN s.currency = 'USD' THEN s.purchase_cost + COALESCE(s.logistics_cost, 0) + COALESCE(s.customs_fee, 0) ELSE 0 END), 0) as exp_usd
                    FROM shipments s 
                    WHERE s.status = 'arrived' 
                    AND EXTRACT(MONTH FROM s.actual_arrival) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM s.actual_arrival) = EXTRACT(YEAR FROM CURRENT_DATE)
                )
                SELECT 
                    (rev_tmt - exp_tmt) as profit_tmt,
                    (rev_usd - exp_usd) as profit_usd
                FROM monthly_revenue, monthly_expenses
            `),
            pool.query(`
                SELECT COUNT(*) as count 
                FROM invoices 
                WHERE status != 'paid' 
                AND due_date < CURRENT_DATE
            `)
        ]);

        res.json({
            totalDebt: {
                debt_tmt: parseFloat(debtRes.rows[0].debt_tmt) || 0,
                debt_usd: parseFloat(debtRes.rows[0].debt_usd) || 0
            },
            goodsInTransit: {
                transit_tmt: parseFloat(transitRes.rows[0].transit_tmt) || 0,
                transit_usd: parseFloat(transitRes.rows[0].transit_usd) || 0
            },
            monthlyProfit: {
                profit_tmt: parseFloat(profitRes.rows[0].profit_tmt) || 0,
                profit_usd: parseFloat(profitRes.rows[0].profit_usd) || 0
            },
            overduePayments: parseInt(overdueRes.rows[0].count) || 0
        });
    } catch (err) {
        logger.error(`Dashboard error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};
