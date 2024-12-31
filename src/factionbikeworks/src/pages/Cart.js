import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Cart = () => {
    const [cartItems, setCartItems] = useState([]);

    useEffect(() => {
        axios.get('/api/cart/1') // Replace with actual user_id
            .then(response => setCartItems(response.data))
            .catch(error => console.error(error));
    }, []);

    const removeItem = (id) => {
        axios.delete(`/api/cart/${id}`)
            .then(() => setCartItems(cartItems.filter(item => item.id !== id)))
            .catch(error => console.error(error));
    };

    return (
        <div>
            <h2>Cart</h2>
            {cartItems.map(item => (
                <div key={item.id}>
                    <p>{item.name} - ${item.price} x {item.quantity}</p>
                    <button onClick={() => removeItem(item.id)}>Remove</button>
                </div>
            ))}
            <a href="/checkout"><button>Proceed to Checkout</button></a>
        </div>
    );
};
export default Cart;
