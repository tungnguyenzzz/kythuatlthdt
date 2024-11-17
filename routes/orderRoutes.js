const express = require('express');
const router = express.Router();
const { 
    getAllOrders, 
  createOrder, 
  updateOrder, 
  getOrder, 
  deleteOrder, 
  updateOrderStatus ,
  getOrderStatistics 
} = require('../controllers/orderController');
//lấy all order
router.get('/orders', getAllOrders);
// Tạo đơn hàng
router.post('/orders', createOrder);

// Cập nhật đơn hàng
router.put('/orders/:id', updateOrder);

// Xem chi tiết đơn hàng
router.get('/orders/:id', getOrder);

// Hủy đơn hàng
router.patch('/orders/:id/cancel', deleteOrder);

// Cập nhật trạng thái đơn hàng
router.patch('/orders/:id/status', updateOrderStatus);
//Thêm route mới để xử lý yêu cầu thống kê:
router.get('/statistics', getOrderStatistics);



module.exports = router;
