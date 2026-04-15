import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as api from "../../services/api";

export const fetchLeaves = createAsyncThunk("leaves/fetch", async (params) => {
  const res = await api.getLeaves(params);
  return res.data;
});

export const fetchPending = createAsyncThunk("leaves/pending", async () => {
  const res = await api.getPendingLeaves();
  return res.data;
});

export const fetchBalance = createAsyncThunk("leaves/balance", async (year) => {
  const res = await api.getMyBalance(year);
  return res.data;
});

const leaveSlice = createSlice({
  name: "leaves",
  initialState: {
    list: [],
    pending: [],
    balance: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaves.pending, (s) => { s.loading = true; })
      .addCase(fetchLeaves.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchLeaves.rejected, (s) => { s.loading = false; })
      .addCase(fetchPending.fulfilled, (s, a) => { s.pending = a.payload; })
      .addCase(fetchBalance.fulfilled, (s, a) => { s.balance = a.payload; });
  },
});

export default leaveSlice.reducer;
