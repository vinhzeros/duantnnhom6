'use client';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart, updateCartItemQuantity } from '@/redux/slices/cartslice';
import { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51QJXQDEDAHperdvjLi2VV1vgHqKaMZD0T4ZSX2cmCVkRnDO295bkKm9XlgeJpTyJb7VrluQGkpTQEuc4qgooXSNs00gdiWp4DI'); 

const CartPage = () => {
    const cartItems = useSelector((state) => state.cart?.items) || [];
    const dispatch = useDispatch();

    // Tính tổng tiền
    const total = useMemo(() => cartItems.reduce((total, item) => total + item.price * item.quantity, 0), [cartItems]);

    // Xử lý thanh toán
    const handlePayment = async () => {
        try {
            const stripe = await stripePromise;

            // Gửi yêu cầu đến API để tạo phiên thanh toán
            const response = await fetch('http://localhost:3000/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cartItems.map(item => ({
                        price_data: {
                            currency: 'vnd',
                            product_data: {
                                name: item.name,
                                images: [`http://localhost:3000/img/${item.image}`], // Hình ảnh sản phẩm
                            },
                            unit_amount: Math.round(item.price * 100), 
                        },
                        quantity: item.quantity,
                    })),
                }),
            });

            // Kiểm tra phản hồi từ API
            if (!response.ok) {
                throw new Error('Không thể tạo phiên thanh toán');
            }

            const session = await response.json();

            // Chuyển hướng đến trang thanh toán của Stripe
            const result = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (result.error) {
                console.error(result.error.message);
                alert('Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau.');
            }
        } catch (error) {
            console.error(error);
            alert('Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau.');
        }
    };

    return (
        <div className="container mt-3">
            <table className="table">
                <thead>
                    <tr>
                        <th scope="col">Tên sản phẩm</th>
                        <th scope="col">Hình ảnh</th>
                        <th scope="col">Số lượng</th>
                        <th scope="col">Giá</th>
                        <th scope="col">Thành tiền</th>
                        <th scope="col">Xóa</th>
                        <th scope="col">Sửa</th>
                    </tr>
                </thead>
                <tbody>
                    {cartItems.map((item) => (
                        <tr key={item._id}>
                            <td>{item.name}</td>
                            <td>
                                <div className="col-6 px-4">
                                    <img src={`http://localhost:3000/img/${item.image}`} width='150px' alt={item.name} />
                                </div>
                            </td>
                            <td>
                                <input
                                    min="1"
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => dispatch(updateCartItemQuantity({ _id: item._id, quantity: parseInt(e.target.value) }))}
                                />
                            </td>
                            <td>{item.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                            <td>{(item.price * item.quantity).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                            <td>
                                <button className="btn btn-danger" onClick={() => dispatch(removeFromCart(item._id))}>
                                    Xóa
                                </button>
                            </td>
                            <td>
                                <button className="btn btn-success" onClick={() => dispatch(updateCartItemQuantity(item._id))}>
                                    Sửa
                                </button>
                            </td>
                        </tr>
                    ))}

                    <tr className='table-primary'>
                        <td colSpan="3">Tổng cộng</td>
                        <td>{total.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                        <td>
                            <button className="btn btn-success" onClick={handlePayment}>
                                Thanh toán
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default CartPage;