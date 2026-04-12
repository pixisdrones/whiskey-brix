const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  // Dashboard
  getDashboard: () => req('GET', '/dashboard'),

  // Recipes
  getRecipes: () => req('GET', '/recipes'),
  getRecipe: (id) => req('GET', `/recipes/${id}`),
  createRecipe: (data) => req('POST', '/recipes', data),
  updateRecipe: (id, data) => req('PUT', `/recipes/${id}`, data),
  deleteRecipe: (id) => req('DELETE', `/recipes/${id}`),
  getIngredients: (id) => req('GET', `/recipes/${id}/ingredients`),

  // Batches
  getBatches: () => req('GET', '/batches'),
  createBatch: (data) => req('POST', '/batches', data),
  deleteBatch: (id) => req('DELETE', `/batches/${id}`),

  // Freeze tests
  getFreezeTests: () => req('GET', '/freeze-tests'),
  createFreezeTest: (data) => req('POST', '/freeze-tests', data),
  deleteFreezeTest: (id) => req('DELETE', `/freeze-tests/${id}`),

  // Tastings
  getTastings: () => req('GET', '/tastings'),
  createTasting: (data) => req('POST', '/tastings', data),
  deleteTasting: (id) => req('DELETE', `/tastings/${id}`),
}
