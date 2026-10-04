import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: undefined,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: [],
    totalAmount: 0,
    myOrders: [],
    searchItems: null,
    socket: null
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload;
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload;
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload;
    },
    setShopsInMyCity: (state, action) => {
      state.shopInMyCity = action.payload;
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload;
    },
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    addToCart: (state, action) => {
      const cartItem = action.payload;
      const existingItem = state.cartItems.find(i => i.id === cartItem.id);
      if (existingItem){
        existingItem.quantity += cartItem.quantity;
      } else {
        state.cartItems.push(cartItem);
      }
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
    },
    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload;
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.cartItems.find(i => i.id === id);
      if (item) {
        item.quantity = quantity;
      }
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
    },
    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter(
        i => i.id !== action.payload
      );

      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
    },
    setMyOrders: (state, action) => {
      state.myOrders = action.payload;
    },
    addMyOrder: (state, action) => {
      state.myOrders = [action.payload, ...state.myOrders];
    },
    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload;
      const order = state.myOrders.find(o => o._id === orderId);

      const orderShopId = order?.shopOrders?.shop?._id || order?.shopOrders?.shop;
      if (order && String(orderShopId) === String(shopId)) {
        order.shopOrders.status = status;
        if (status === "cancelled") {
          order.shopOrders.assignedDeliveryBoy = null;
        }
      }
    },
    updateRealtimeOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload;
      const order = state.myOrders.find(o => o._id === orderId);
      if (order) {
        const shopOrders = Array.isArray(order.shopOrders) ? order.shopOrders : [order.shopOrders];
        const shopOrder = shopOrders.find(
          so => String(so?.shop?._id || so?.shop) === String(shopId)
        );
        
        if (shopOrder) {
          shopOrder.status = status;
          if (status === "cancelled") {
            shopOrder.assignedDeliveryBoy = null;
          }
        }
      }
    },
    setSearchItems: (state, action) => {
      state.searchItems = action.payload;
    }
  }
});


// ✅ Named exports (so this works)
// import { setUserData } from '../redux/userSlice';
export const {
  setUserData,
  setCurrentAddress,
  setCurrentCity,
  setCurrentState,
  setShopsInMyCity,
  setItemsInMyCity,
  addToCart,
  updateQuantity,
  removeCartItem,
  setMyOrders,
  addMyOrder,
  updateOrderStatus,
  setSearchItems,
  setTotalAmount,
  setSocket,
  updateRealtimeOrderStatus
} = userSlice.actions;


// ✅ Default export for reducer
export default userSlice.reducer;
