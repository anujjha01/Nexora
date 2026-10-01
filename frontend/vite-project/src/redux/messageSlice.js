import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
  name: "message",

  initialState: {
    message: [],
    isLoading: false,
    loadingStatus: "",
  },

  reducers: {

    setMessage: (state, action) => {
      state.message = action.payload;
    },
    addMessage: (state, action) => {
      state.message.push(action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
      if (!action.payload) state.loadingStatus = "";
    },
    setLoadingStatus: (state, action) => {
      state.loadingStatus = action.payload;
    },
  },
});

export const { setMessage, addMessage, setLoading, setLoadingStatus } = messageSlice.actions;

export default messageSlice.reducer;
