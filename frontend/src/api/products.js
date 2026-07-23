import client from './client'

export const getProducts = (skip = 0, limit = 100, filters = {}) => {
  const params = { skip, limit, ...filters }
  return client.get('/products', { params })
}

export const getProduct = (productId) => {
  return client.get(`/products/${productId}`)
}
