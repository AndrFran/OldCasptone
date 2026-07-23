import client from './client'

export const getProducts = (skip = 0, limit = 100) => {
  return client.get('/products', {
    params: { skip, limit }
  })
}

export const getProduct = (productId) => {
  return client.get(`/products/${productId}`)
}
