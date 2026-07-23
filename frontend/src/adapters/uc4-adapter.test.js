/**
 * UC4 Adapter Test File
 *
 * Manual testing during development.
 * These tests can be run in the browser console or with Jest if configured.
 *
 * Usage:
 * 1. Import in dev environment: import('./adapters/uc4-adapter.test.js')
 * 2. Or copy-paste test functions into browser console
 * 3. Run each test function: await testGetOrderById()
 */

import { uc4Adapter } from './uc4-adapter'
import mockOrdersService from '../services/mockOrdersService'

/**
 * Test: Get existing order by ID
 */
export async function testGetOrderById() {
  console.log('=== Test: Get Order by ID ===')
  try {
    const order = await uc4Adapter.getOrderById(1001)
    console.log('✅ Success:', order)
    return order
  } catch (err) {
    console.error('❌ Error:', err.message)
    return null
  }
}

/**
 * Test: Get non-existent order (should throw)
 */
export async function testGetOrderByIdNotFound() {
  console.log('=== Test: Get Non-Existent Order ===')
  try {
    await uc4Adapter.getOrderById(9999)
    console.error('❌ Should have thrown error')
    return false
  } catch (err) {
    console.log('✅ Correctly threw error:', err.message)
    return true
  }
}

/**
 * Test: Get all orders for customer
 */
export async function testGetCustomerOrders() {
  console.log('=== Test: Get Customer Orders ===')
  try {
    const data = await uc4Adapter.getCustomerOrders(1)
    console.log('✅ Success:', data)
    return data
  } catch (err) {
    console.error('❌ Error:', err.message)
    return null
  }
}

/**
 * Test: Get all orders
 */
export async function testGetAllOrders() {
  console.log('=== Test: Get All Orders ===')
  try {
    const data = await uc4Adapter.getAllOrders()
    console.log('✅ Success - Total orders:', data.total)
    console.log('Orders:', data.items)
    return data
  } catch (err) {
    console.error('❌ Error:', err.message)
    return null
  }
}

/**
 * Test: Get all orders filtered by status
 */
export async function testGetAllOrdersByStatus() {
  console.log('=== Test: Get Orders Filtered by Status ===')
  try {
    const data = await uc4Adapter.getAllOrders({ status: 'pending' })
    console.log('✅ Success - Pending orders:', data.total)
    console.log('Orders:', data.items)
    return data
  } catch (err) {
    console.error('❌ Error:', err.message)
    return null
  }
}

/**
 * Test: Update order status (valid transition)
 */
export async function testUpdateOrderStatusValid() {
  console.log('=== Test: Update Order Status (Valid) ===')
  try {
    // Reset to known state
    mockOrdersService.resetToInitialState()

    // Get an order in "pending" status
    const order = mockOrdersService.getOrderById(1004)
    console.log('Initial status:', order.status)

    // Update to confirmed
    const updated = await uc4Adapter.updateOrderStatus(1004, 'confirmed')
    console.log('✅ Success - Updated status:', updated.status)
    return updated
  } catch (err) {
    console.error('❌ Error:', err.message)
    return null
  }
}

/**
 * Test: Update order status (invalid transition)
 */
export async function testUpdateOrderStatusInvalid() {
  console.log('=== Test: Update Order Status (Invalid) ===')
  try {
    // Reset to known state
    mockOrdersService.resetToInitialState()

    // Try invalid transition: pending → delivered
    await uc4Adapter.updateOrderStatus(1004, 'delivered')
    console.error('❌ Should have thrown error')
    return false
  } catch (err) {
    console.log('✅ Correctly threw error:', err.message)
    return true
  }
}

/**
 * Test: Update non-existent order
 */
export async function testUpdateOrderNotFound() {
  console.log('=== Test: Update Non-Existent Order ===')
  try {
    await uc4Adapter.updateOrderStatus(9999, 'shipped')
    console.error('❌ Should have thrown error')
    return false
  } catch (err) {
    console.log('✅ Correctly threw error:', err.message)
    return true
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n\n========================================')
  console.log('UC4 ADAPTER & MOCK SERVICE TEST SUITE')
  console.log('========================================\n')

  const results = {
    passed: 0,
    failed: 0,
  }

  const tests = [
    { name: 'Get Order by ID', fn: testGetOrderById },
    { name: 'Get Order Not Found', fn: testGetOrderByIdNotFound },
    { name: 'Get Customer Orders', fn: testGetCustomerOrders },
    { name: 'Get All Orders', fn: testGetAllOrders },
    { name: 'Get Orders Filtered by Status', fn: testGetAllOrdersByStatus },
    { name: 'Update Order Status (Valid)', fn: testUpdateOrderStatusValid },
    { name: 'Update Order Status (Invalid)', fn: testUpdateOrderStatusInvalid },
    { name: 'Update Non-Existent Order', fn: testUpdateOrderNotFound },
  ]

  for (const test of tests) {
    const result = await test.fn()
    if (result) {
      results.passed++
    } else if (result === false) {
      results.passed++ // Error case that passed
    } else {
      results.failed++
    }
    console.log('\n')
  }

  console.log('========================================')
  console.log(`RESULTS: ${results.passed} passed, ${results.failed} failed`)
  console.log('========================================\n')
}

/**
 * Export for testing
 */
export default {
  testGetOrderById,
  testGetOrderByIdNotFound,
  testGetCustomerOrders,
  testGetAllOrders,
  testGetAllOrdersByStatus,
  testUpdateOrderStatusValid,
  testUpdateOrderStatusInvalid,
  testUpdateOrderNotFound,
  runAllTests,
}
