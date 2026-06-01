import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export const getProducts = async () => {
  const { data } = await api.get("/products");
  return data.data || [];
};

export const createProduct = async (payload) => {
  const { data } = await api.post("/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
};

export const refreshProduct = async (id) => {
  const { data } = await api.post(`/products/${id}/refresh`);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const getProductHistory = async (id) => {
  const { data } = await api.get(`/products/${id}/history`);
  return data.data || [];
};
