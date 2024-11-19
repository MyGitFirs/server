const sql = require('mssql');
const config = require('../db');

// Add product to basket
const addToBasket = async (req, res) => {
    const { user_id, product_id, quantity, total_price } = req.body;

    try {
        let pool = await sql.connect(config);

        // Check if the item is already in the basket
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('product_id', sql.Int, product_id)
            .query(`SELECT * FROM basket WHERE user_id = @user_id AND product_id = @product_id`);

        if (result.recordset.length > 0) {
            return res.status(200).json({ success: false, message: 'Item already in cart' });
        }

        // Add the item to the basket
        await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('product_id', sql.Int, product_id)
            .input('quantity', sql.Int, quantity)
            .input('total_price', sql.Decimal(10, 2), total_price)
            .query(`INSERT INTO basket (user_id, product_id, quantity, total_price) 
                    VALUES (@user_id, @product_id, @quantity, @total_price)`);

        res.status(200).json({ success: true, message: 'Product added to basket successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add product to basket' });
    }
};


const userIdBasket = async (req, res) => {
    const { user_id } = req.params;

    try {
        let pool = await sql.connect(config);

        let basketItems = await pool.request()
            .input('user_id', sql.Int, user_id)
            .query(`
                SELECT b.id AS cart_id, b.product_id, p.name AS product_name, b.quantity, 
                       b.total_price, p.image_url AS imagePath
                FROM basket b
                JOIN products p ON b.product_id = p.product_id
                WHERE b.user_id = @user_id
            `);

        res.status(200).json(basketItems.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch basket items' });
    }
};


const updateQuantity = async (req, res) => {
    const { id } = req.params;
    const { quantity, total_price } = req.body;

    try {
        let pool = await sql.connect(config);

        await pool.request()
            .input('id', sql.Int, id)
            .input('quantity', sql.Int, quantity)
            .input('total_price', sql.Decimal(10, 2), total_price)
            .query(`
                UPDATE basket 
                SET quantity = @quantity, total_price = @total_price 
                WHERE id = @id
            `);

        res.status(200).json({ message: 'Basket updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update basket' });
    }
};


const removeItem = async (req, res) => {
    const { id } = req.params;

    try {
        let pool = await sql.connect(config);

        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM basket WHERE id = @id
            `);

        res.status(200).json({ message: 'Product removed from basket' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove product from basket' });
    }
};


module.exports = {
    addToBasket,
    userIdBasket,
    updateQuantity,
    removeItem
};
