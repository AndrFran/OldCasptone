import './OrderStatusFilter.css'

export default function OrderStatusFilter({ currentFilter, onFilterChange, orders }) {
  const statuses = ['pending', 'confirmed', 'shipped', 'delivered']

  const getCountByStatus = (status) => {
    if (!status) return orders.length
    return orders.filter(order => order.status === status).length
  }

  return (
    <div className="order-status-filter">
      <h4>Filter by Status</h4>

      <button
        className={`filter-button ${!currentFilter ? 'active' : ''}`}
        onClick={() => onFilterChange(null)}
      >
        <span>All Orders</span>
        <span className="count">{orders.length}</span>
      </button>

      {statuses.map(status => (
        <button
          key={status}
          className={`filter-button status-${status} ${currentFilter === status ? 'active' : ''}`}
          onClick={() => onFilterChange(status)}
        >
          <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          <span className="count">{getCountByStatus(status)}</span>
        </button>
      ))}
    </div>
  )
}
