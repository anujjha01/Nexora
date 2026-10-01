import { createSlice } from "@reduxjs/toolkit";

const conversationSlice = createSlice({
  name: "conversation",

  initialState: {
    conversation: [],
    selectedConversation: null,
  },

  reducers: {
    setConversation: (state, action) => {
      const data = action.payload;

      // Handles both:
      // [ ...conversations ]
      // { conversations: [ ... ] }
      state.conversation = Array.isArray(data)
        ? data
        : Array.isArray(data?.conversations)
          ? data.conversations
          : Array.isArray(data?.data)
            ? data.data
            : [];
    },

    addConversation: (state, action) => {
      const data = action.payload;

      const conversation = data?.conversation || data?.data || data;

      if (conversation) {
        state.conversation.unshift(conversation);
      }
    },

    setSelectedConversation: (state, action) => {
      state.selectedConversation = action.payload;
    },
    removeConversation: (state, action) => {
      state.conversation = state.conversation.filter(
        (conv) => conv._id !== action.payload
      );
    },
    updateConversationTitle: (state, action) => {
      const { id, title } = action.payload;
      // Update in the list
      const conv = state.conversation.find((c) => c._id === id);
      if (conv) conv.title = title;
      // Update selectedConversation
      if (state.selectedConversation?._id === id) {
        state.selectedConversation = { ...state.selectedConversation, title };
      }
    },
  },
});

export const {
  setConversation,
  addConversation,
  setSelectedConversation,
  removeConversation,
  updateConversationTitle,
} = conversationSlice.actions;

export default conversationSlice.reducer;