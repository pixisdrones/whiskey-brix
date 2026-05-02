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
  getRecipeCost: (id) => req('GET', `/recipes/${id}/cost`),
  getRecipeBatches: (id) => req('GET', `/recipes/${id}/batches`),
  getRecipeStats: (id) => req('GET', `/recipes/${id}/stats`),

  // Batches
  getBatches: () => req('GET', '/batches'),
  createBatch: (data) => req('POST', '/batches', data),
  updateBatch: (id, data) => req('PUT', `/batches/${id}`, data),
  deleteBatch: (id) => req('DELETE', `/batches/${id}`),
  planBatch: (data) => req('POST', '/batches/plan', data),
  getNextBatchId: (recipe_id, date) => req('GET', `/batches/next-id?recipe_id=${recipe_id}&date=${date ?? ''}`),

  // Freeze tests
  getFreezeTests: () => req('GET', '/freeze-tests'),
  createFreezeTest: (data) => req('POST', '/freeze-tests', data),
  updateFreezeTest: (id, data) => req('PUT', `/freeze-tests/${id}`, data),
  deleteFreezeTest: (id) => req('DELETE', `/freeze-tests/${id}`),

  // Tastings
  getTastings: () => req('GET', '/tastings'),
  createTasting: (data) => req('POST', '/tastings', data),
  updateTasting: (id, data) => req('PUT', `/tastings/${id}`, data),
  deleteTasting: (id) => req('DELETE', `/tastings/${id}`),
  getNextTastingLabel: () => req('GET', '/tastings/next-label'),

  // Ingredients Catalog
  getCatalog: () => req('GET', '/ingredients-catalog'),
  createCatalogItem: (data) => req('POST', '/ingredients-catalog', data),
  updateCatalogItem: (id, data) => req('PUT', `/ingredients-catalog/${id}`, data),
  deleteCatalogItem: (id) => req('DELETE', `/ingredients-catalog/${id}`),

  // Testers
  getTesters: () => req('GET', '/testers'),
  createTester: (data) => req('POST', '/testers', data),
  updateTester: (id, data) => req('PUT', `/testers/${id}`, data),
  deleteTester: (id) => req('DELETE', `/testers/${id}`),

  // Molds
  getMolds: () => req('GET', '/molds'),
  createMold: (data) => req('POST', '/molds', data),
  updateMold: (id, data) => req('PUT', `/molds/${id}`, data),
  deleteMold: (id) => req('DELETE', `/molds/${id}`),
  getMoldCubes: (id) => req('GET', `/molds/${id}/cubes`),
  fillMold: (id, data) => req('POST', `/molds/${id}/fill`, data),
  updateCube: (cubeId, data) => req('PATCH', `/molds/cubes/${cubeId}`, data),
}
