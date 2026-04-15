import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import leaveReducer from "./slices/leaveSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leaves: leaveReducer,
    ui: uiReducer,
  },
});
