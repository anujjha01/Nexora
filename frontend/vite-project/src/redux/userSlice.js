import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",

  initialState: {
    userData: null,
  },

  reducers: {
    setUseradata: (state, action) => {
      state.userData = action.payload;
    },
  },
});

export const { setUseradata } = userSlice.actions;

export default userSlice.reducer;