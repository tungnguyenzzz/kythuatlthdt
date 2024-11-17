const pool = require('../models/db');

//;ấy all order đê hiển thị
exports.getAllOrders = async (req, res) => {
    try {
      // Truy vấn tất cả đơn hàng
      const orders = await pool.query(`
        SELECT o.id, o.customer_id, o.notes, o.status, 
               json_agg(json_build_object(
                 'product_id', oi.product_id,
                 'quantity', oi.quantity,
                 'options', oi.options
               )) AS items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.id DESC
      `);
  
      res.json(orders.rows); // Trả về danh sách đơn hàng
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
// Tạo đơn hàng 1
// exports.createOrder = async (req, res) => {
//   const { customer_id, items, notes } = req.body;
//   try {
//     const result = await pool.query(
//       `INSERT INTO orders (customer_id, notes, status) 
//        VALUES ($1, $2, 'new') RETURNING id`,
//       [customer_id, notes]
//     );
//     const orderId = result.rows[0].id;

//     // Lưu chi tiết đơn hàng
//     const promises = items.map(item => {
//       return pool.query(
//         `INSERT INTO order_items (order_id, product_id, quantity, options) 
//          VALUES ($1, $2, $3, $4)`,
//         [orderId, item.product_id, item.quantity, JSON.stringify(item.options)]
//       );
//     });
//     await Promise.all(promises);

//     res.status(201).json({ message: 'Order created', orderId });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
//tạo đơn hàng 2
exports.createOrder = async (req, res) => {
  const { customer_id, items, notes, discount = 0, tax = 0 } = req.body;
  console.log('test',customer_id, items, notes)
  try {
    // Tạo đơn hàng
    const result = await pool.query(
      `INSERT INTO orders (customer_id, notes, status) 
       VALUES ($1, $2, 'new') RETURNING id`,
      [customer_id, notes]
    );
    const orderId = result.rows[0].id;

    // Lưu chi tiết các sản phẩm trong đơn hàng
    let subtotal = 0;
    const promises = items.map(async (item) => {
      const { product_id, product_name, quantity, price, options } = item;
      subtotal += quantity * price;

      return pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, options) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, product_id, product_name, quantity, JSON.stringify(options)]
      );
    });

    await Promise.all(promises);

    // Tính toán giá trị đơn hàng
    const total = subtotal - discount + tax;

    // Lưu chi tiết giá bán vào bảng order_prices
    await pool.query(
      `INSERT INTO order_prices (order_id, subtotal, discount, tax, total) 
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, subtotal, discount, tax, total]
    );

    res.status(201).json({ message: 'Order created', orderId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Cập nhật đơn hàng
// exports.updateOrder = async (req, res) => {
//   const { id } = req.params;
//   const { items, notes } = req.body;
//   try {
//     // Update ghi chú
//     await pool.query(`UPDATE orders SET notes = $1 WHERE id = $2`, [notes, id]);

//     // Update chi tiết sản phẩm
//     const promises = items.map(item => {
//       return pool.query(
//         `UPDATE order_items SET quantity = $1, options = $2 WHERE order_id = $3 AND product_id = $4`,
//         [item.quantity, JSON.stringify(item.options), id, item.product_id]
//       );
//     });
//     await Promise.all(promises);

//     res.json({ message: 'Order updated' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const { items, notes } = req.body;
  

  try {
    // Kiểm tra trạng thái đơn hàng
    const order = await pool.query(`SELECT status FROM orders WHERE id = $1`, [id]);
    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.rows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update a cancelled order' });
    }

    // Update notes
    await pool.query(`UPDATE orders SET notes = $1 WHERE id = $2`, [notes, id]);

    // Update items
    const promises = items.map((item) =>
      pool.query(
        `UPDATE order_items SET quantity = $1, options = $2 WHERE order_id = $3 AND product_id = $4`,
        [item.quantity, JSON.stringify(item.options), id, item.product_id]
      )
    );
    await Promise.all(promises);

    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error(err.message,'aa');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Xem chi tiết đơn hàng 1
exports.getOrder = async (req, res) => {
    
  const { id } = req.params;
  
  try {
    const order = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
    const items = await pool.query(`SELECT * FROM order_items WHERE order_id = $1`, [id]);

    res.json({ order: order.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xem chi tiết đơn hàng 2
// exports.getOrder = async (req, res) => {
//   const { id } = req.params;

//   try {
//     // Lấy thông tin đơn hàng
//     const order = await pool.query(
//       `SELECT o.id, c.name AS customer_name, o.notes, o.status, op.subtotal, op.discount, op.tax, op.total
//        FROM orders o
//        JOIN customers c ON o.customer_id = c.id
//        JOIN order_prices op ON o.id = op.order_id
//        WHERE o.id = $1`,
//       [id]
//     );

//     // Lấy danh sách sản phẩm trong đơn hàng
//     const items = await pool.query(
//       `SELECT product_id, product_name, quantity, options
//        FROM order_items
//        WHERE order_id = $1`,
//       [id]
//     );

//     res.json({ order: order.rows[0], items: items.rows });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// Hủy đơn hàng
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Order ${id} not found` });
    }
    res.json({ message: `Order ${id} cancelled successfully` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Cập nhật trạng thái đơn hàng
// exports.updateOrderStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;
//   try {
//     await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
//     res.json({ message: 'Order status updated' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Kiểm tra xem đơn hàng có tồn tại hay không
    const order = await pool.query(`SELECT status FROM orders WHERE id = $1`, [id]);
    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Nếu đơn hàng đã hoàn thành hoặc bị hủy, không cho phép thay đổi trạng thái
    if (order.rows[0].status === 'completed' || order.rows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update status of a completed or cancelled order' });
    }

    // Cập nhật trạng thái
    await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ message: `Order ${id} status updated to ${status}` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
// mới để xử lý yêu cầu thống kê:
exports.getOrderStatistics = async (req, res) => {
  
  try {
    // Tổng số đơn hàng
    const totalOrders = await pool.query(`SELECT COUNT(*) AS total FROM orders`);
    // Tổng doanh thu (giả sử mỗi item có giá trị trong bảng "products")
    // const totalRevenue = await pool.query(`
    //   SELECT COALESCE(SUM(oi.quantity * p.price), 0) AS revenue
    //   FROM order_items oi
    //   JOIN products p ON oi.product_id = p.id
    // `);
    // Số đơn hàng theo trạng thái
    const ordersByStatus = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM orders
      GROUP BY status
    `);

    
    // Trả về dữ liệu thống kê
    res.json({
      totalOrders: totalOrders.rows[0].total,
      // totalRevenue: totalRevenue.rows[0].revenue,
      ordersByStatus: ordersByStatus.rows,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
