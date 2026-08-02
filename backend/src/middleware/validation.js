const Joi = require('joi');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required()
});

const clientSchema = Joi.object({
    company_name: Joi.string().min(2).max(255).required(),
    contact_person: Joi.string().allow('', null).max(255),
    phone: Joi.string().allow('', null).max(30),
    email: Joi.string().email().allow('', null),
    tax_id: Joi.string().allow('', null).max(50),
    credit_limit: Joi.number().min(0).default(0)
});

const orderItemSchema = Joi.object({
    product_id: Joi.number().integer().allow(null),
    name: Joi.string().allow('', null).max(255),
    quantity: Joi.number().positive().precision(4).required(),
    unit_price: Joi.number().positive().precision(2).required(),
    unit: Joi.string().valid('pcs', 'kg', 'liter', 'meter', 'sqm', 'can').default('pcs')
});

const orderSchema = Joi.object({
    client_id: Joi.number().integer().required(),
    items: Joi.array().items(orderItemSchema).min(1).max(100).required(),
    notes: Joi.string().allow('', null).max(1000),
    currency: Joi.string().valid('USD', 'TMT').default('USD')
});

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('admin', 'manager', 'viewer').default('manager'),
    position: Joi.string().required().max(100)
});

const shipmentSchema = Joi.object({
    order_id: Joi.number().integer().positive().required(),
    supplier_name: Joi.string().min(2).max(255).required(),
    purchase_cost: Joi.number().min(0).precision(2).required(),
    logistics_cost: Joi.number().min(0).precision(2).default(0),
    customs_fee: Joi.number().min(0).precision(2).default(0),
    expected_arrival: Joi.date().iso().allow(null),
    tracking_number: Joi.string().allow('', null).max(100),
    currency: Joi.string().valid('USD', 'TMT').default('TMT')
});

const invoiceSchema = Joi.object({
    order_id: Joi.number().integer().positive().required(),
    amount: Joi.number().min(0).precision(2).required(),
    currency: Joi.string().valid('USD', 'TMT').default('USD'),
    due_date: Joi.date().iso().required()
});

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true
        });
        
        if (error) {
            const details = error.details.map(detail => detail.message);
            return res.status(400).json({ 
                error: 'Ошибка валидации данных', 
                details 
            });
        }
        
        next();
    };
};

module.exports = {
    validate,
    schemas: {
        login: loginSchema,
        client: clientSchema,
        order: orderSchema,
        user: userSchema,
        shipment: shipmentSchema,
        invoice: invoiceSchema
    }
};
