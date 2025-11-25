// src/api/base44Client.js
// Dummy stub so Vercel build works without a real Base44 App ID

const base44 = {
  entities: {
    User: {
      list: async () => [],
      get: async () => null,
    },
    Message: {
      list: async () => [],
      get: async () => null,
    },
  },
  // add more dummy methods if your components call them
};

export { base44 };
