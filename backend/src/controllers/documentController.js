const ExcelJS = require('exceljs');
const pool = require('../config/db');
const logger = require('../utils/logger');

exports.exportInvoicesToExcel = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                CONCAT('Inv-', LPAD(i.id::text, 5, '0')) as invoice_id,
                TO_CHAR(i.issue_date, 'DD.MM.YYYY') as date,
                CONCAT('DTL', LPAD(o.id::text, 7, '0')) as reference,
                c.company_name as client,
                CONCAT(i.currency, ' ', TO_CHAR(i.amount, 'FM999,999,999,999.00')) as total,
                i.status,
                CONCAT(i.currency, ' ', TO_CHAR(i.paid_amount, 'FM999,999,999,999.00')) as paid,
                CONCAT(i.currency, ' ', TO_CHAR(i.amount - i.paid_amount, 'FM999,999,999,999.00')) as remaining,
                TO_CHAR(i.due_date, 'DD.MM.YYYY') as due_date
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN clients c ON o.client_id = c.id
            ORDER BY i.id DESC
        `);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Batly Sowda';
        const ws = workbook.addWorksheet('Invoices');

        ws.columns = [
            { header: 'INVOICE #', key: 'invoice_id', width: 16 },
            { header: 'DATE', key: 'date', width: 14 },
            { header: 'REFERENCE', key: 'reference', width: 16 },
            { header: 'CLIENT', key: 'client', width: 35 },
            { header: 'TOTAL', key: 'total', width: 18 },
            { header: 'STATUS', key: 'status', width: 14 },
            { header: 'PAID', key: 'paid', width: 18 },
            { header: 'REMAINING', key: 'remaining', width: 18 },
            { header: 'DUE DATE', key: 'due_date', width: 14 }
        ];

        ws.addRows(rows);

        const header = ws.getRow(1);
        header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
        header.alignment = { vertical: 'middle', horizontal: 'center' };
        header.height = 28;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=batly_invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();

        logger.info(`✅ Excel export completed: ${rows.length} invoices`);
    } catch (err) {
        logger.error(`❌ Excel export error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};